# The Birthday Paradox — Interactive Solver & Research Lab

A complete, high-fidelity research dashboard and mathematical playground for the **Birthday Paradox**, featuring a vectorised Python backend, interactive 3D particle constellation visuals, live statistical simulations, and publication-ready LaTeX research report compilation.

---

## 🚀 Key Features

* **Complete Multi-Page Suite**: Full navigation panel containing Home, About, Live Simulation, Team, Guidance, and PDF Report pages.
* **NumPy Vectorised Backend (Flask)**: High-speed Monte Carlo simulations (up to 5,000 trials evaluated in milliseconds) powered by vectorised NumPy on a Flask API.
* **Stunning 3D Paradox Theme (Three.js)**: A global, interactive 3D particle constellation consisting of two nested counter-rotating spheres (representing Set A and Set B) with real-time proximity-based linkage connectors representing "birthday collisions."
* **Mouse-responsive Parallax**: Silky smooth camera tracking mapped directly to mouse coordinates.
* **Dynamic Charting (Chart.js)**: Real-time visualization of single-run birthday grids, statistical metrics, analytical vs. experimental convergence, and custom distribution models.
* **LaTeX Report Compilation**: Complete academic paper (`report.tex`) on the Birthday Paradox compiled locally to PDF and served straight to your browser.

---

## 🛠️ Technology Stack

* **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism theme), Vanilla JavaScript (ES6)
* **Visuals & Charts**: Three.js (3D particles), Chart.js (Data rendering)
* **Backend**: Flask (Python 3), NumPy (Monte Carlo engine)
* **Typesetting**: LaTeX (Tectonic self-contained compilation)
* **Hosting / Cloud**: Vercel (Python Serverless Functions)

---

## 📦 Directory Structure

```
Birthday Paradox/
├── app.py                      # Flask Server + Vectorised NumPy APIs
├── requirements.txt            # Python dependencies (Flask, NumPy)
├── vercel.json                 # Vercel deployment & routing config
├── .vercelignore               # Vercel upload rules
├── report.tex                  # Pgfplots-enabled LaTeX academic source
├── static/
│   ├── css/
│   │   └── style.css           # Premium dark glassmorphism stylesheet
│   ├── js/
│   │   ├── simulation.js       # Live simulator backend-bridge & Chart.js logic
│   │   └── three-background.js # Custom Three.js 3D backdrop renderer
│   └── Birthday_Paradox_Report.pdf # Compiled LaTeX document
└── templates/                  # Jinja2 Layout Templates
    ├── base.html
    ├── index.html              # Home page
    ├── about.html              # Mathematical context
    ├── simulation.html         # Interactive simulator sandbox
    ├── team.html               # Project members list
    ├── guidance.html           # Advisory mentors
    └── pdf.html                # Embedded research report reader
```

---

## 💻 Local Setup & Execution

### Prerequisites
Make sure you have Python 3 and Node.js/npm installed.

### 1. Run the Flask Web Application
Install the required Python packages and launch the local server:
```bash
pip install flask numpy
python3 app.py
```
Open **[http://localhost:8080](http://localhost:8080)** in your web browser.

### 2. Compile the Academic LaTeX Document
If you wish to re-compile the academic report PDF locally:
```bash
# Install Tectonic (lightweight LaTeX compiler)
brew install tectonic

# Compile report
tectonic report.tex

# Move output to static folder
mv report.pdf static/Birthday_Paradox_Report.pdf
```
*Once compiled, the PDF becomes immediately viewable and downloadable at [http://localhost:8080/pdf](http://localhost:8080/pdf).*

---

## ☁️ Vercel Deployment

Deploy this project to Vercel's serverless platform in seconds.

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Deploy
Run the deploy command from the project root:
```bash
vercel
```
Follow the interactive prompts to link your Vercel account. Once finished, compile a production deployment:
```bash
vercel --prod
```
Vercel automatically detects the `vercel.json` config and builds the serverless Python environment using the `@vercel/python` builder.
