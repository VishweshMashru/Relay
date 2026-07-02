package edge

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strconv"
	"sync"
	"time"
)

// ffmpegManager owns the ffmpeg subprocesses. One supervised task per active
// session: if ffmpeg dies while the session is still wanted (camera blip,
// network drop), it restarts with backoff instead of leaving the session
// "live" with a dead stream. Safe for concurrent Start/Stop from the poll loop.
type ffmpegManager struct {
	mu    sync.Mutex
	tasks map[string]*streamTask
}

type streamTask struct {
	cancel context.CancelFunc
	done   chan struct{}
}

func newFfmpegManager() *ffmpegManager {
	return &ffmpegManager{tasks: make(map[string]*streamTask)}
}

// Start begins supervising an RTSP→RTMPS push for the session. Returns
// quickly; the stream runs (and self-heals) until Stop.
func (m *ffmpegManager) Start(sessionID, rtspURL, pushURL string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, exists := m.tasks[sessionID]; exists {
		return fmt.Errorf("session %s already streaming", sessionID)
	}
	ctx, cancel := context.WithCancel(context.Background())
	t := &streamTask{cancel: cancel, done: make(chan struct{})}
	m.tasks[sessionID] = t
	go m.supervise(ctx, t, sessionID, rtspURL, pushURL)
	return nil
}

func (m *ffmpegManager) supervise(ctx context.Context, t *streamTask, sessionID, rtspURL, pushURL string) {
	defer close(t.done)
	defer func() {
		m.mu.Lock()
		delete(m.tasks, sessionID)
		m.mu.Unlock()
	}()

	backoff := 2 * time.Second
	for {
		started := time.Now()
		err := runFfmpeg(ctx, sessionID, rtspURL, pushURL)
		if ctx.Err() != nil {
			return // stopped on purpose
		}
		// A healthy stretch means the earlier failures were transient.
		if time.Since(started) > time.Minute {
			backoff = 2 * time.Second
		}
		log.Printf("ffmpeg exited session=%s err=%v — restarting in %s", sessionID, err, backoff)
		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}
		if backoff < 30*time.Second {
			backoff *= 2
		}
	}
}

// runFfmpeg blocks until the process exits. Cancelling ctx kills it.
func runFfmpeg(ctx context.Context, sessionID, rtspURL, pushURL string) error {
	// Transcode to H.264 with CF Stream Live's constraints. Codec copy would
	// be cheaper but many RTSP sources (iOS IP-cam apps especially) emit
	// H.265, which CF Stream RTMPS ingest silently rejects. ~10% CPU for
	// 720p is fine for a Mac; we'll add source-codec detection to skip
	// transcode when input is already H.264 in a later pass.
	//   -tune zerolatency: minimize encoder buffering
	//   -pix_fmt yuv420p:  universal browser compat
	//   -g 60:             keyframe every ~2s at 30fps for smooth HLS chunking
	//   -an:               drop audio (privacy + one less codec to fight)
	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-loglevel", "info",
		"-rtsp_transport", "tcp",
		"-use_wallclock_as_timestamps", "1",
		"-i", rtspURL,
		"-c:v", "libx264",
		"-preset", "veryfast",
		"-tune", "zerolatency",
		"-pix_fmt", "yuv420p",
		"-g", "60",
		"-an",
		"-f", "flv",
		pushURL,
	)
	cmd.Stderr = os.Stderr
	cmd.Stdout = os.Stdout

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("ffmpeg start: %w", err)
	}
	// Log the push URL with the stream key masked so we can see the shape
	// but not leak the credential to shared logs.
	log.Printf("ffmpeg started session=%s pid=%d push=%s", sessionID, cmd.Process.Pid, maskURL(pushURL))
	return cmd.Wait()
}

// Stop ends the supervised stream for a session. No-op if there isn't one.
func (m *ffmpegManager) Stop(sessionID string) {
	m.mu.Lock()
	t, ok := m.tasks[sessionID]
	m.mu.Unlock()
	if !ok {
		return
	}
	t.cancel()
	<-t.done
	log.Printf("stream stopped session=%s", sessionID)
}

// maskURL hides everything after the last "/" so stream keys don't hit logs.
func maskURL(u string) string {
	idx := -1
	for i := len(u) - 1; i >= 0; i-- {
		if u[i] == '/' {
			idx = i
			break
		}
	}
	if idx < 0 || idx == len(u)-1 {
		return u
	}
	// Show first 4 chars of the key + length so we can spot obvious issues
	// like an empty key or literal "null".
	tail := u[idx+1:]
	shown := tail
	if len(shown) > 4 {
		shown = shown[:4] + "…"
	}
	return u[:idx+1] + shown + " (" + strconv.Itoa(len(tail)) + " chars)"
}

// StopAll ends every supervised stream. Called at agent shutdown.
func (m *ffmpegManager) StopAll() {
	m.mu.Lock()
	tasks := make([]*streamTask, 0, len(m.tasks))
	for sid, t := range m.tasks {
		tasks = append(tasks, t)
		log.Printf("stream stopping session=%s (shutdown)", sid)
	}
	m.mu.Unlock()
	for _, t := range tasks {
		t.cancel()
		<-t.done
	}
}
