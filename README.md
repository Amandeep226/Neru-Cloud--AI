# NeuroCloud AI — Autonomous Zero-Water Compute & Edge-Memory Orchestrator

**Live Demo:** https://neurocloud-ai.ai.studio/

## Overview
**NeuroCloud AI** eliminates freshwater cooling and centralized cloud database overhead in modern AI workloads:
- **Zero Cloud DB Writes:** Encrypts conversational state locally in the browser using **Web Crypto AES-256-GCM** (`0 B` written to cloud DBs).
- **Thermal-Aware Zero-Water Routing:** Dynamically routes lightweight inference to dry-cooled photonic nodes (`NeuroNode-Photonic-04`) and heavy GPU training workloads to closed-loop dielectric immersion nodes (`NeuroNode-Immersion-02`), hard-blocking evaporative clusters (`WUE = 0.00 L/kWh`).
- **Verifiable ISO-14046 ESG Auditing:** Computes avoided freshwater in real time against the `1.8 L/kWh` baseline and exports a signed `.txt` ESG compliance receipt.

## System Architecture
```mermaid
flowchart LR
    A[User Browser / Edge Client] -->|1. Prompt / Workload| B[NeuroCloud Thermal & WUE Router]
    A <-->|2. AES-256-GCM Local State| C[(Browser localStorage - 0B Cloud DB)]
    B -->|3. Predict ΔT| D{Workload Size}
    D -->|Light Inference| E[NeuroNode-Photonic-04 Dry-Cooled]
    D -->|Heavy Training| F[NeuroNode-Immersion-02 Closed-Loop]
    D -.->|Bypassed| G[Legacy Evaporative DC - 1.8 L/kWh Saved]
    E --> H[ISO-14046 ESG Ledger & Proof .txt]
    F --> H
