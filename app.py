"""
Birthday Paradox — Flask Backend
Serves HTML pages and exposes NumPy Monte Carlo simulation APIs.
"""

from flask import Flask, render_template, jsonify, request
import numpy as np
import time

app = Flask(__name__)
np.random.seed(42)

# ==========================================
# ANALYTICAL FORMULAS
# ==========================================

def analytical_exact(n, days=365):
    if n > days:
        return 1.0
    p = 1.0
    for k in range(n):
        p *= (days - k) / days
    return 1.0 - p

def poisson_approx(n, days=365):
    return 1.0 - np.exp(-n * (n - 1) / (2 * days))

def analytical_month(n):
    return analytical_exact(n, days=12)

# ==========================================
# VECTORIZED NUMPY MONTE CARLO ENGINES
# ==========================================

def simulate_exact(n, trials, days=365):
    draws = np.random.randint(1, days + 1, size=(trials, n))
    draws.sort(axis=1)
    matches = np.any(draws[:, 1:] == draws[:, :-1], axis=1)
    return float(np.mean(matches))

def simulate_near(n, trials, delta, days=365):
    if n <= 1:
        return 0.0
    draws = np.random.randint(1, days + 1, size=(trials, n))
    draws.sort(axis=1)
    diffs = draws[:, 1:] - draws[:, :-1]
    has_adj = np.any(diffs <= delta, axis=1)
    wrap = (days - draws[:, -1]) + draws[:, 0]
    has_wrap = wrap <= delta
    return float(np.mean(has_adj | has_wrap))

def simulate_month(n, trials):
    draws = np.random.randint(1, 13, size=(trials, n))
    draws.sort(axis=1)
    matches = np.any(draws[:, 1:] == draws[:, :-1], axis=1)
    return float(np.mean(matches))

def simulate_nonuniform(n, trials, probs):
    days = len(probs)
    draws = np.random.choice(np.arange(1, days + 1), size=(trials, n), p=probs)
    draws.sort(axis=1)
    matches = np.any(draws[:, 1:] == draws[:, :-1], axis=1)
    return float(np.mean(matches))

def make_nonuniform_probs(peak=3.0, trough=-1.5):
    x = np.arange(1, 366)
    base = np.ones(365)
    p1 = peak * np.exp(-((x - 250) ** 2) / (2 * 30 ** 2))
    p2 = 1.0 * np.exp(-((x - 140) ** 2) / (2 * 20 ** 2))
    t1 = trough * np.exp(-((x - 45) ** 2) / (2 * 15 ** 2))
    probs = base + p1 + p2 + t1
    probs = np.clip(probs, 0.1, None)
    probs /= probs.sum()
    return probs

# ==========================================
# HTML PAGE ROUTES
# ==========================================

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/simulation")
def simulation():
    return render_template("simulation.html")

@app.route("/team")
def team():
    return render_template("team.html")

@app.route("/guidance")
def guidance():
    return render_template("guidance.html")

@app.route("/pdf")
def pdf_page():
    return render_template("pdf.html")

# ==========================================
# SIMULATION API ENDPOINTS
# ==========================================

@app.route("/api/batch", methods=["POST"])
def api_batch():
    """Run a full batch simulation for group sizes 1..max_n."""
    data = request.json
    mode = data.get("mode", "exact")
    trials = int(data.get("trials", 1000))
    delta = int(data.get("delta", 1))
    max_n = int(data.get("max_n", 100))
    peak = float(data.get("peak", 3.0))
    trough = float(data.get("trough", -1.5))

    probs = make_nonuniform_probs(peak, trough)

    t0 = time.perf_counter()
    results = []
    for n in range(1, max_n + 1):
        if mode == "exact":
            results.append(simulate_exact(n, trials))
        elif mode == "near":
            results.append(simulate_near(n, trials, delta))
        elif mode == "month":
            results.append(simulate_month(n, trials))
        elif mode == "nonuniform":
            results.append(simulate_nonuniform(n, trials, probs))
    elapsed = round((time.perf_counter() - t0) * 1000)

    # Analytical curves for comparison
    anal_exact = [analytical_exact(n) for n in range(1, max_n + 1)]
    anal_poisson = [poisson_approx(n) for n in range(1, max_n + 1)]
    anal_month = [analytical_month(n) if n <= 13 else 1.0 for n in range(1, max_n + 1)]

    # 50% crossing
    crossing = None
    for i, p in enumerate(results):
        if p >= 0.5:
            crossing = i + 1
            break

    return jsonify({
        "results": results,
        "analytical_exact": anal_exact,
        "analytical_poisson": anal_poisson,
        "analytical_month": anal_month,
        "crossing": crossing,
        "elapsed_ms": elapsed
    })

@app.route("/api/convergence", methods=["POST"])
def api_convergence():
    """Run convergence analysis for a fixed group size."""
    data = request.json
    target_n = int(data.get("n", 23))
    true_val = analytical_exact(target_n)

    trial_counts = [10, 50, 100, 200, 500, 1000, 2000, 5000]
    repeats = 30
    mean_errors = []
    std_errors = []

    for tc in trial_counts:
        mat = np.random.randint(1, 366, size=(repeats, tc, target_n))
        mat.sort(axis=2)
        row_matches = np.any(mat[:, :, 1:] == mat[:, :, :-1], axis=2)
        estimates = np.mean(row_matches, axis=1)
        errors = np.abs(estimates - true_val)
        mean_errors.append(float(np.mean(errors)))
        std_errors.append(float(np.std(errors)))

    return jsonify({
        "trial_counts": trial_counts,
        "mean_errors": mean_errors,
        "std_errors": std_errors,
        "true_val": true_val
    })

@app.route("/api/single", methods=["POST"])
def api_single():
    """Run a single trial and return individual birthdays + match info."""
    data = request.json
    mode = data.get("mode", "exact")
    n = int(data.get("n", 23))
    delta = int(data.get("delta", 1))
    peak = float(data.get("peak", 3.0))
    trough = float(data.get("trough", -1.5))

    # Generate birthdays
    if mode in ("exact", "near"):
        bdays = np.random.randint(1, 366, size=n).tolist()
    elif mode == "month":
        bdays = np.random.randint(1, 13, size=n).tolist()
    elif mode == "nonuniform":
        probs = make_nonuniform_probs(peak, trough)
        bdays = np.random.choice(np.arange(1, 366), size=n, p=probs).tolist()
    else:
        bdays = np.random.randint(1, 366, size=n).tolist()

    # Detect matches
    matched = []
    labels = []

    if mode in ("exact", "nonuniform"):
        seen = {}
        for i, v in enumerate(bdays):
            if v in seen:
                matched.extend([i, seen[v]])
                labels.append(v)
            else:
                seen[v] = i
    elif mode == "month":
        seen = {}
        for i, v in enumerate(bdays):
            if v in seen:
                matched.extend([i, seen[v]])
                labels.append(v)
            else:
                seen[v] = i
    elif mode == "near":
        idx_sorted = sorted(range(n), key=lambda i: bdays[i])
        for i in range(n - 1):
            a, b = idx_sorted[i], idx_sorted[i + 1]
            if bdays[b] - bdays[a] <= delta:
                matched.extend([a, b])
                labels.append(f"{bdays[a]}-{bdays[b]}")
        if n > 1:
            first, last = idx_sorted[0], idx_sorted[-1]
            wrap = (365 - bdays[last]) + bdays[first]
            if wrap <= delta:
                matched.extend([first, last])
                labels.append(f"{bdays[last]}-{bdays[first]}w")

    return jsonify({
        "birthdays": bdays,
        "matched": list(set(matched)),
        "labels": labels,
        "mode": mode
    })

@app.route("/api/distribution", methods=["POST"])
def api_distribution():
    """Return non-uniform distribution shape."""
    data = request.json
    peak = float(data.get("peak", 3.0))
    trough = float(data.get("trough", -1.5))
    probs = make_nonuniform_probs(peak, trough)
    # Downsample to 50 bars
    step = 365 // 50
    bars = []
    base = 1.0 / 365
    for i in range(50):
        s = i * step
        e = min(s + step, 365)
        avg = float(probs[s:e].mean())
        bars.append(round(avg / base, 3))
    return jsonify({"bars": bars})


if __name__ == "__main__":
    app.run(debug=True, port=8080)
