package relay

import "strings"

// EdgeChannel maps an edge UUID to a Postgres LISTEN/NOTIFY channel name.
// Strips hyphens so the value is a valid unquoted SQL identifier.
func EdgeChannel(edgeUUID string) string {
	return "edge_" + strings.ReplaceAll(edgeUUID, "-", "")
}
