package edge

import (
	"bufio"
	"fmt"
	"net"
	"net/url"
	"strings"
	"time"
)

// ProbeRTSP checks that something RTSP-shaped answers at the URL: TCP dial,
// then a bare OPTIONS request. A 200 or a 401 both count as success — auth
// is negotiated later at DESCRIBE/SETUP, so a 401 still proves an RTSP
// server is listening.
func ProbeRTSP(rawURL string, timeout time.Duration) error {
	u, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("parse url: %w", err)
	}
	if u.Scheme != "rtsp" && u.Scheme != "rtsps" {
		return fmt.Errorf("scheme %q is not rtsp", u.Scheme)
	}
	host := u.Host
	if u.Port() == "" {
		host = net.JoinHostPort(u.Hostname(), "554")
	}

	conn, err := net.DialTimeout("tcp", host, timeout)
	if err != nil {
		return fmt.Errorf("connect %s: %w", host, err)
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(timeout))

	if _, err := fmt.Fprintf(conn, "OPTIONS %s RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: relay-edge\r\n\r\n", rawURL); err != nil {
		return fmt.Errorf("send OPTIONS: %w", err)
	}
	line, err := bufio.NewReader(conn).ReadString('\n')
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}
	if !strings.HasPrefix(line, "RTSP/1.0 ") {
		return fmt.Errorf("not an RTSP server (got %q)", strings.TrimSpace(line))
	}
	code := strings.Fields(line)[1]
	if code != "200" && code != "401" {
		return fmt.Errorf("rtsp responded %s", strings.TrimSpace(line))
	}
	return nil
}
