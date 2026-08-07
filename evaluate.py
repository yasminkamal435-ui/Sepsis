"""
تقييم شامل للنموذج المدرَّب: AUROC, AUPRC, Sensitivity/Specificity عند نقاط قطع
مختلفة، ومصفوفة الالتباس. يحفظ تقرير JSON + رسم منحنى ROC/PR.
"""
import argparse
import json
import os
import numpy as np
import torch
from sklearn.metrics import (
    roc_auc_score, average_precision_score, roc_curve, precision_recall_curve,
    confusion_matrix, classification_report,
)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from model_fusion import SepsisFusionModel
from timeseries_to_image import batch_windows_to_images


def main(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    X = np.load(os.path.join(args.data_dir, "X.npy"))
    y = np.load(os.path.join(args.data_dir, "y.npy"))

    imgs = batch_windows_to_images(X)
    model = SepsisFusionModel(X.shape[2]).to(device)
    model.load_state_dict(torch.load(args.checkpoint, map_location=device))
    model.eval()

    with torch.no_grad():
        xb = torch.tensor(X, dtype=torch.float32).to(device)
        imgb = torch.tensor(imgs, dtype=torch.float32).to(device)
        logits, _ = model(xb, imgb)
        probs = torch.sigmoid(logits).cpu().numpy()

    auroc = roc_auc_score(y, probs)
    auprc = average_precision_score(y, probs)
    preds = (probs >= 0.5).astype(int)
    cm = confusion_matrix(y, preds).tolist()
    report = classification_report(y, preds, output_dict=True)

    os.makedirs("reports", exist_ok=True)
    with open("reports/metrics.json", "w", encoding="utf-8") as f:
        json.dump({
            "AUROC": auroc, "AUPRC": auprc,
            "confusion_matrix": cm, "classification_report": report,
        }, f, ensure_ascii=False, indent=2)

    fpr, tpr, _ = roc_curve(y, probs)
    prec, rec, _ = precision_recall_curve(y, probs)

    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))
    axes[0].plot(fpr, tpr, label=f"AUROC={auroc:.3f}")
    axes[0].plot([0, 1], [0, 1], "--", color="gray")
    axes[0].set_xlabel("False Positive Rate"); axes[0].set_ylabel("True Positive Rate")
    axes[0].set_title("ROC Curve"); axes[0].legend()

    axes[1].plot(rec, prec, label=f"AUPRC={auprc:.3f}", color="darkorange")
    axes[1].set_xlabel("Recall"); axes[1].set_ylabel("Precision")
    axes[1].set_title("Precision-Recall Curve"); axes[1].legend()

    plt.tight_layout()
    plt.savefig("reports/curves.png", dpi=150)

    print(f"AUROC={auroc:.4f} | AUPRC={auprc:.4f}")
    print("تم حفظ التقرير في reports/metrics.json و reports/curves.png")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="data/processed")
    parser.add_argument("--checkpoint", default="models/sepsis_fusion_best.pt")
    args = parser.parse_args()
    main(args)
