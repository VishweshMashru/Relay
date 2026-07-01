// Package webviewer embeds the reference HLS viewer HTML so relay-api can
// serve it directly. Ships inside the binary — no separate static-file host,
// no runtime dependency on the source tree.
package webviewer

import (
	"embed"
	"io/fs"
)

//go:embed static
var files embed.FS

// FS returns the viewer's file tree rooted at index.html.
func FS() fs.FS {
	sub, err := fs.Sub(files, "static")
	if err != nil {
		panic(err) // build-time constant path; can't fail at runtime
	}
	return sub
}
