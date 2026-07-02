package api

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"relay/internal/relay"
)

// dispatcher owns the process-wide Postgres LISTEN connection and fans
// command notifications out to waiting edge long-polls. Without it every
// connected edge pinned one pool connection for the length of its poll,
// which exhausts the default pool (~4 conns) at a handful of edges.
type dispatcher struct {
	pool *pgxpool.Pool

	mu   sync.Mutex
	subs map[string]map[chan struct{}]struct{} // edge ID -> waiters
}

func newDispatcher(pool *pgxpool.Pool) *dispatcher {
	return &dispatcher{pool: pool, subs: make(map[string]map[chan struct{}]struct{})}
}

// subscribe registers interest in commands for edgeID. The returned channel
// delivers at most one wakeup; always call cancel to release the slot.
func (d *dispatcher) subscribe(edgeID string) (<-chan struct{}, func()) {
	ch := make(chan struct{}, 1)
	d.mu.Lock()
	if d.subs[edgeID] == nil {
		d.subs[edgeID] = make(map[chan struct{}]struct{})
	}
	d.subs[edgeID][ch] = struct{}{}
	d.mu.Unlock()
	return ch, func() {
		d.mu.Lock()
		delete(d.subs[edgeID], ch)
		if len(d.subs[edgeID]) == 0 {
			delete(d.subs, edgeID)
		}
		d.mu.Unlock()
	}
}

func (d *dispatcher) wake(edgeID string) {
	d.mu.Lock()
	for ch := range d.subs[edgeID] {
		select {
		case ch <- struct{}{}:
		default:
		}
	}
	d.mu.Unlock()
}

// wakeAll fires every waiter — used after a LISTEN reconnect, when
// notifications may have been missed while the connection was down. Waiters
// re-claim from the commands table, so a spurious wake costs one cheap query.
func (d *dispatcher) wakeAll() {
	d.mu.Lock()
	for _, waiters := range d.subs {
		for ch := range waiters {
			select {
			case ch <- struct{}{}:
			default:
			}
		}
	}
	d.mu.Unlock()
}

// run holds the LISTEN connection for the life of the process, reconnecting
// with backoff on error. Blocks until ctx is cancelled.
func (d *dispatcher) run(ctx context.Context) {
	backoff := time.Second
	for ctx.Err() == nil {
		start := time.Now()
		if err := d.listen(ctx); err != nil && ctx.Err() == nil {
			log.Printf("dispatcher: %v (reconnect in %s)", err, backoff)
			select {
			case <-ctx.Done():
				return
			case <-time.After(backoff):
			}
			// Reset backoff after a healthy stretch; otherwise keep growing.
			if time.Since(start) > time.Minute {
				backoff = time.Second
			} else if backoff < 30*time.Second {
				backoff *= 2
			}
		}
	}
}

func (d *dispatcher) listen(ctx context.Context) error {
	pc, err := d.pool.Acquire(ctx)
	if err != nil {
		return err
	}
	// Hijack the connection out of the pool: it stays in LISTEN mode for its
	// whole life and must never be handed back to serve regular queries.
	conn := pc.Hijack()
	defer conn.Close(context.Background())

	if _, err := conn.Exec(ctx, "LISTEN "+relay.CommandsChannel); err != nil {
		return err
	}
	// Anyone already waiting may have missed a notify while we were down.
	d.wakeAll()

	for {
		n, err := conn.WaitForNotification(ctx)
		if err != nil {
			return err
		}
		d.wake(n.Payload)
	}
}
