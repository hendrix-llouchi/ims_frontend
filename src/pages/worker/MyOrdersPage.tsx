import { useState, useCallback } from 'react';
import { fetchAssignedOrders, deliverOrder, flagOrder } from '../../api/worker/workerApi';
import type { WorkerOrder, Paginated } from '../../types/workerApi';
import { usePaginatedFetch } from '../../hooks/usePaginatedFetch';

// ─── Flag modal ─────────────────────────────────────────────────────────────────
interface FlagModalProps {
  orderId: number;
  onClose: () => void;
  onFlagged: (updated: WorkerOrder) => void;
}

function FlagModal({ orderId, onClose, onFlagged }: FlagModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please enter a reason.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await flagOrder(orderId, reason.trim());
      onFlagged(res.order);
    } catch {
      setError('Failed to flag order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="wm-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Flag order">
      <div className="wm-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="wm-card__title">Flag Order #{orderId}</h2>
        <p className="wm-card__subtitle">Describe the issue with this order.</p>

        {error && <div className="wm-alert wm-alert--error">{error}</div>}

        <form onSubmit={handleSubmit} className="wm-form">
          <textarea
            id={`flag-reason-${orderId}`}
            className="wm-textarea"
            placeholder="e.g. Address not found, customer unavailable…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            disabled={submitting}
            autoFocus
          />
          <div className="wm-form__actions">
            <button
              type="button"
              className="wm-btn wm-btn--ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              id={`submit-flag-${orderId}`}
              className="wm-btn wm-btn--danger"
              disabled={submitting || !reason.trim()}
            >
              {submitting ? 'Flagging…' : 'Flag Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Order card ─────────────────────────────────────────────────────────────────
interface OrderCardProps {
  order: WorkerOrder;
  onDelivered: (id: number) => void;
  onFlagged: (updated: WorkerOrder) => void;
}

function OrderCard({ order, onDelivered, onFlagged }: OrderCardProps) {
  const [delivering, setDelivering] = useState(false);
  const [showFlag, setShowFlag] = useState(false);
  const [deliverError, setDeliverError] = useState('');

  const isActionable = order.status === 'assigned';

  async function handleDeliver() {
    setDelivering(true);
    setDeliverError('');
    try {
      await deliverOrder(order.id);
      onDelivered(order.id);
    } catch {
      setDeliverError('Failed to mark as delivered. Try again.');
    } finally {
      setDelivering(false);
    }
  }

  return (
    <>
      <article className="wo-card" id={`order-card-${order.id}`}>
        {/* Header */}
        <div className="wo-card__header">
          <div>
            <span className="wo-card__id">Order #{order.id}</span>
            <span className={`wo-badge wo-badge--${order.status}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          <span className="wo-card__deadline">
            Due {formatDate(order.delivery_deadline)}
          </span>
        </div>

        {/* Recipient */}
        <div className="wo-card__recipient">
          <span className="wo-card__label">Recipient</span>
          <span className="wo-card__value">{order.recipient_name}</span>
          <span className="wo-card__contact">{order.recipient_contact}</span>
        </div>

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

        {/* Error */}
        {deliverError && (
          <div className="wm-alert wm-alert--error" style={{ marginTop: '0.5rem' }}>
            {deliverError}
          </div>
        )}

        {/* Actions */}
        {isActionable && (
          <div className="wo-card__actions">
            <button
              id={`deliver-order-${order.id}`}
              className="wm-btn wm-btn--primary"
              onClick={handleDeliver}
              disabled={delivering}
            >
              {delivering ? 'Marking…' : '✓ Delivered'}
            </button>
            <button
              id={`flag-order-${order.id}`}
              className="wm-btn wm-btn--outline-danger"
              onClick={() => setShowFlag(true)}
            >
              ⚑ Flag
            </button>
          </div>
        )}
      </article>

      {showFlag && (
        <FlagModal
          orderId={order.id}
          onClose={() => setShowFlag(false)}
          onFlagged={(updated) => {
            setShowFlag(false);
            onFlagged(updated);
          }}
        />
      )}
    </>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function MyOrdersPage() {
  const fetcher = useCallback(
    (page: number) => fetchAssignedOrders(page),
    [],
  );

  const {
    data,
    setData,
    page,
    setPage,
    totalPages,
    loading,
    error,
    reload,
  } = usePaginatedFetch<WorkerOrder>(fetcher);

  function handleDelivered(id: number) {
    setData((prev: Paginated<WorkerOrder>) => ({
      ...prev,
      data: prev.data.map((o) =>
        o.id === id ? { ...o, status: 'delivered' as const } : o,
      ),
    }));
  }

  function handleFlagged(updated: WorkerOrder) {
    setData((prev: Paginated<WorkerOrder>) => ({
      ...prev,
      data: prev.data.map((o) => (o.id === updated.id ? updated : o)),
    }));
  }

  return (
    <section className="wp-section">
      <div className="wp-section__heading">
        <h1 className="wp-section__title">My Orders</h1>
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
          <p>No orders assigned to you yet.</p>
        </div>
      )}

      <div className="wo-list">
        {data.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onDelivered={handleDelivered}
            onFlagged={handleFlagged}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="wp-pagination">
          <button
            className="wm-btn wm-btn--ghost wm-btn--sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            id="my-orders-prev"
          >
            ← Prev
          </button>
          <span className="wp-pagination__info">
            {page} / {totalPages}
          </span>
          <button
            className="wm-btn wm-btn--ghost wm-btn--sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            id="my-orders-next"
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
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
