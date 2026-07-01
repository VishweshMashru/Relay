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
