import { useCallback } from 'react';
import { fetchAllOrders } from '../../api/worker/workerApi';
import type { WorkerOrder } from '../../types/workerApi';
import { usePaginatedFetch } from '../../hooks/usePaginatedFetch';

// ─── Status badge config ───────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  unassigned: 'Unassigned',
  assigned:   'Assigned',
  delivered:  'Delivered',
  flagged:    'Flagged',
};

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── Read-only order card ───────────────────────────────────────────────────────
function AllOrderCard({ order }: { order: WorkerOrder }) {
  return (
    <article className="wo-card" id={`all-order-card-${order.id}`}>
      {/* Header */}
      <div className="wo-card__header">
        <div>
          <span className="wo-card__id">Order #{order.id}</span>
          <span className={`wo-badge wo-badge--${order.status}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
        <span className="wo-card__deadline">Due {formatDate(order.delivery_deadline)}</span>
      </div>

      {/* Recipient */}
      <div className="wo-card__recipient">
        <span className="wo-card__label">Recipient</span>
        <span className="wo-card__value">{order.recipient_name}</span>
        <span className="wo-card__contact">{order.recipient_contact}</span>
      </div>

      {/* Assigned worker */}
      {order.worker && (
        <div className="wo-card__worker">
          <span className="wo-card__label">Assigned to</span>
          <span className="wo-card__value">{order.worker.name}</span>
        </div>
      )}

      {/* Items */}
      <ul className="wo-card__items">
        {order.items.map((item) => (
          <li key={item.id} className="wo-card__item">
            <span className="wo-card__item-name">{item.product.name}</span>
            <span className="wo-card__item-qty">
              {item.quantity} {item.product.unit}
            </span>
          </li>
        ))}
      </ul>

      {/* Flag reason (if flagged) */}
      {order.status === 'flagged' && order.flag_reason && (
        <div className="wo-card__flag-reason">
          <span className="wo-card__label">Flag reason</span>
          <p className="wo-card__flag-text">{order.flag_reason}</p>
        </div>
      )}
    </article>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function AllOrdersPage() {
  const fetcher = useCallback((page: number) => fetchAllOrders(page), []);

  const { data, page, setPage, totalPages, loading, error, reload } =
    usePaginatedFetch<WorkerOrder>(fetcher);

  return (
    <section className="wp-section">
      <div className="wp-section__heading">
        <h1 className="wp-section__title">All Orders</h1>
        <button className="wm-btn wm-btn--ghost wm-btn--sm" onClick={reload}>
          Refresh
        </button>
      </div>

      {loading && <div className="wp-loader">Loading orders…</div>}
      {error && (
        <div className="wm-alert wm-alert--error">
          {error}{' '}
          <button className="wm-alert__retry" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="wp-empty">
          <span className="wp-empty__icon">📋</span>
          <p>No orders in the system yet.</p>
        </div>
      )}

      <div className="wo-list">
        {data.map((order) => (
          <AllOrderCard key={order.id} order={order} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="wp-pagination">
          <button
            id="all-orders-prev"
            className="wm-btn wm-btn--ghost wm-btn--sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span className="wp-pagination__info">
            {page} / {totalPages}
          </span>
          <button
            id="all-orders-next"
            className="wm-btn wm-btn--ghost wm-btn--sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}
