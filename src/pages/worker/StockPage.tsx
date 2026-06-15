import { useCallback } from 'react';
import { fetchStock } from '../../api/worker/workerApi';
import type { WorkerProduct } from '../../types/workerApi';
import { usePaginatedFetch } from '../../hooks/usePaginatedFetch';

function stockPercent(product: WorkerProduct) {
  if (!product.max_stock_level) return 0;
  return Math.min(100, Math.round((product.current_stock / product.max_stock_level) * 100));
}

function StockBar({ pct }: { pct: number }) {
  let barClass = 'ws-bar__fill';
  if (pct <= 30) barClass += ' ws-bar__fill--low';
  else if (pct <= 60) barClass += ' ws-bar__fill--mid';
  return (
    <div className="ws-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={barClass} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StockCard({ product }: { product: WorkerProduct }) {
  const pct = stockPercent(product);
  const isLow = pct <= 30;

  return (
    <article className="ws-card" id={`stock-card-${product.id}`}>
      <div className="ws-card__header">
        <div>
          <h2 className="ws-card__name">{product.name}</h2>
          <span className="ws-card__meta">{product.type} · {product.unit}</span>
        </div>
        {isLow && <span className="ws-card__badge ws-card__badge--low">Low Stock</span>}
      </div>

      <div className="ws-card__stock-row">
        <span className="ws-card__stock-val">
          {product.current_stock}
          <span className="ws-card__stock-max"> / {product.max_stock_level}</span>
        </span>
        <span className="ws-card__pct">{pct}%</span>
      </div>

      <StockBar pct={pct} />

      <div className="ws-card__warehouse">
        <span className="wo-card__label">Warehouse</span>
        <span className="wo-card__value">{product.warehouse.name}</span>
        <span className="wo-card__contact">{product.warehouse.location}</span>
      </div>
    </article>
  );
}

export default function StockPage() {
  const fetcher = useCallback((page: number) => fetchStock(page), []);

  const { data, page, setPage, totalPages, loading, error, reload } =
    usePaginatedFetch<WorkerProduct>(fetcher);

  return (
    <section className="wp-section">
      <div className="wp-section__heading">
        <h1 className="wp-section__title">Stock Levels</h1>
        <button className="wm-btn wm-btn--ghost wm-btn--sm" onClick={reload}>
          Refresh
        </button>
      </div>

      {loading && <div className="wp-loader">Loading stock…</div>}
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
          <span className="wp-empty__icon">📦</span>
          <p>No products in stock yet.</p>
        </div>
      )}

      <div className="wo-list">
        {data.map((product) => (
          <StockCard key={product.id} product={product} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="wp-pagination">
          <button
            id="stock-prev"
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
            id="stock-next"
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
