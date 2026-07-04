package edge

import (
	"encoding/json"
	"os"
)

// Config is the edge's local view of the cameras it owns. RTSP URLs live here
// and NEVER travel to the cloud.
//
// Example cameras.json:
//
//	{
//	  "cameras": {
//	    "692d6d4c-e050-499b-bff3-a278943b23df": "rtsp://admin:pass@192.168.1.20:554/live"
//	  }
//	}
type Config struct {
	Cameras map[string]string `json:"cameras"`
}

// LoadConfig reads cameras.json. Missing file is OK — the agent runs, it just
// won't have any cameras to start on 'start' commands.
func LoadConfig(path string) (*Config, error) {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return &Config{Cameras: map[string]string{}}, nil
		}
		return nil, err
	}
	defer f.Close()

	var cfg Config
	if err := json.NewDecoder(f).Decode(&cfg); err != nil {
		return nil, err
	}
	if cfg.Cameras == nil {
		cfg.Cameras = map[string]string{}
	}
	return &cfg, nil
}

// ResolveConfigPath finds cameras.json the same way across the agent and the
// `relay-edge camera` CLI: explicit env, then the working directory, then the
// installer's location.
func ResolveConfigPath() string {
	if p := os.Getenv("RELAY_CAMERAS_FILE"); p != "" {
		return p
	}
	if _, err := os.Stat("cameras.json"); err == nil {
		return "cameras.json"
	}
	if _, err := os.Stat("/etc/relay-edge/cameras.json"); err == nil {
		return "/etc/relay-edge/cameras.json"
	}
	return "cameras.json"
}

// SaveConfig writes cameras.json atomically (temp file + rename) with 0600
// permissions — the file holds camera credentials.
func SaveConfig(path string, cfg *Config) error {
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, append(data, '\n'), 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}
