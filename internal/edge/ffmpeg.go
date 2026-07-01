package edge

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"sync"
)

// ffmpegManager owns the ffmpeg subprocesses. One per active session. Safe
// for concurrent Start/Stop from the poll loop.
type ffmpegManager struct {
	mu    sync.Mutex
	procs map[string]*exec.Cmd
}

func newFfmpegManager() *ffmpegManager {
	return &ffmpegManager{procs: make(map[string]*exec.Cmd)}
}

// Start spawns ffmpeg pushing RTSP → RTMPS with codec copy (no re-encode).
// Returns quickly; the process runs until Stop or self-exits.
func (m *ffmpegManager) Start(sessionID, rtspURL, pushURL string) error {
	m.mu.Lock()
	if _, exists := m.procs[sessionID]; exists {
		m.mu.Unlock()
		return fmt.Errorf("session %s already streaming", sessionID)
	}
	m.mu.Unlock()

	// Transcode to H.264 with CF Stream Live's constraints. Codec copy would
	// be cheaper but many RTSP sources (iOS IP-cam apps especially) emit
	// H.265, which CF Stream RTMPS ingest silently rejects. ~10% CPU for
	// 720p is fine for a Mac; we'll add source-codec detection to skip
	// transcode when input is already H.264 in a later pass.
	//   -tune zerolatency: minimize encoder buffering
	//   -pix_fmt yuv420p:  universal browser compat
	//   -g 60:             keyframe every ~2s at 30fps for smooth HLS chunking
	//   -an:               drop audio (privacy + one less codec to fight)
	cmd := exec.Command("ffmpeg",
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

	m.mu.Lock()
	m.procs[sessionID] = cmd
	m.mu.Unlock()

	// Log the push URL with the stream key masked so we can see the shape
	// but not leak the credential to shared logs.
	log.Printf("ffmpeg started session=%s pid=%d push=%s", sessionID, cmd.Process.Pid, maskURL(pushURL))

	// Reap on exit so a crash doesn't leave the map stale.
	go func() {
		err := cmd.Wait()
		m.mu.Lock()
		delete(m.procs, sessionID)
		m.mu.Unlock()
		if err != nil {
			log.Printf("ffmpeg exited session=%s err=%v", sessionID, err)
		} else {
			log.Printf("ffmpeg exited session=%s cleanly", sessionID)
		}
	}()
	return nil
}

// Stop kills the ffmpeg process for a session. No-op if there isn't one.
func (m *ffmpegManager) Stop(sessionID string) {
	m.mu.Lock()
	cmd, ok := m.procs[sessionID]
	m.mu.Unlock()
	if !ok || cmd.Process == nil {
		return
	}
	if err := cmd.Process.Kill(); err != nil {
		log.Printf("ffmpeg kill session=%s: %v", sessionID, err)
	}
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
	return u[:idx+1] + shown + " (" + itoa(len(tail)) + " chars)"
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}

// StopAll kills every running ffmpeg. Called at agent shutdown.
func (m *ffmpegManager) StopAll() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for sid, cmd := range m.procs {
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		log.Printf("ffmpeg killed session=%s (shutdown)", sid)
	}
}
