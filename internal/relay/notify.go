package relay

// CommandsChannel is the single Postgres NOTIFY channel for new commands.
// The payload is the target edge's UUID. relay-api holds one LISTEN
// connection on this channel and fans wakeups out to whichever edge
// long-polls are waiting — one pinned connection total, instead of one per
// connected edge.
const CommandsChannel = "relay_commands"
