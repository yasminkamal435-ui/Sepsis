"""
تدريب نموذج التنبؤ بالإنتان. يدعم 3 أوضاع:
  --model gru     : فرع السلاسل الزمنية فقط
  --model cnn      : فرع الصور (Computer Vision) فقط
  --model fusion   : النموذج المدموج (الافتراضي والموصى به)

يتعامل مع مشكلة عدم توازن الفئات (Class Imbalance) الشديدة في بيانات
الإنتان (~1.8% فقط من الساعات فيها Label=1) عبر:
  - Weighted Random Sampler
  - Focal Loss اختياري
"""
import argparse
import os
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from sklearn.model_selection import train_test_split

from model_lstm import SepsisGRUModel
from model_cnn import SepsisCNNModel
from model_fusion import SepsisFusionModel
from timeseries_to_image import batch_windows_to_images


class SepsisDataset(Dataset):
    def __init__(self, X, y, images=None):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y = torch.tensor(y, dtype=torch.float32)
        self.images = torch.tensor(images, dtype=torch.float32) if images is not None else None

    def __len__(self):
        return len(self.y)

    def __getitem__(self, idx):
        if self.images is not None:
            return self.X[idx], self.images[idx], self.y[idx]
        return self.X[idx], self.y[idx]


class FocalLoss(nn.Module):
    def __init__(self, alpha=0.85, gamma=2.0):
        super().__init__()
        self.alpha, self.gamma = alpha, gamma
        self.bce = nn.BCEWithLogitsLoss(reduction="none")

    def forward(self, logits, targets):
        bce_loss = self.bce(logits, targets)
        pt = torch.exp(-bce_loss)
        alpha_t = self.alpha * targets + (1 - self.alpha) * (1 - targets)
        loss = alpha_t * (1 - pt) ** self.gamma * bce_loss
        return loss.mean()


def get_sampler(y):
    class_counts = np.bincount(y.astype(int))
    weights = 1.0 / class_counts
    sample_weights = weights[y.astype(int)]
    return WeightedRandomSampler(sample_weights, num_samples=len(y), replacement=True)


def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    X = np.load(os.path.join(args.data_dir, "X.npy"))
    y = np.load(os.path.join(args.data_dir, "y.npy"))
    print(f"Loaded X: {X.shape}, y: {y.shape}, positive rate: {y.mean():.3%}")

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.15, stratify=y, random_state=42
    )

    n_features = X.shape[2]
    criterion = FocalLoss()

    if args.model == "gru":
        model = SepsisGRUModel(n_features).to(device)
        train_ds = SepsisDataset(X_train, y_train)
        val_ds = SepsisDataset(X_val, y_val)
    elif args.model == "cnn":
        train_imgs = batch_windows_to_images(X_train)
        val_imgs = batch_windows_to_images(X_val)
        model = SepsisCNNModel().to(device)
        train_ds = SepsisDataset(X_train, y_train, train_imgs)
        val_ds = SepsisDataset(X_val, y_val, val_imgs)
    else:  # fusion
        train_imgs = batch_windows_to_images(X_train)
        val_imgs = batch_windows_to_images(X_val)
        model = SepsisFusionModel(n_features).to(device)
        train_ds = SepsisDataset(X_train, y_train, train_imgs)
        val_ds = SepsisDataset(X_val, y_val, val_imgs)

    sampler = get_sampler(y_train)
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, sampler=sampler)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False)

    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=3, factor=0.5)

    best_auroc = 0.0
    os.makedirs("models", exist_ok=True)

    for epoch in range(args.epochs):
        model.train()
        total_loss = 0.0
        for batch in train_loader:
            optimizer.zero_grad()
            if args.model == "fusion":
                xb, imgb, yb = [t.to(device) for t in batch]
                logits, _ = model(xb, imgb)
            elif args.model == "cnn":
                _, imgb, yb = [t.to(device) for t in batch]
                logits = model(imgb)
            else:
                xb, yb = [t.to(device) for t in batch]
                logits = model(xb)

            loss = criterion(logits, yb)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            optimizer.step()
            total_loss += loss.item()

        auroc = evaluate_quick(model, val_loader, device, args.model)
        scheduler.step(auroc)
        print(f"Epoch {epoch+1}/{args.epochs} | loss={total_loss/len(train_loader):.4f} | val_AUROC={auroc:.4f}")

        if auroc > best_auroc:
            best_auroc = auroc
            torch.save(model.state_dict(), f"models/sepsis_{args.model}_best.pt")
            print(f"  ↳ نموذج أفضل، تم الحفظ (AUROC={auroc:.4f})")

    print(f"\nأفضل AUROC على مجموعة التحقق: {best_auroc:.4f}")


def evaluate_quick(model, loader, device, model_type):
    from sklearn.metrics import roc_auc_score
    model.eval()
    all_probs, all_labels = [], []
    with torch.no_grad():
        for batch in loader:
            if model_type == "fusion":
                xb, imgb, yb = [t.to(device) for t in batch]
                logits, _ = model(xb, imgb)
            elif model_type == "cnn":
                _, imgb, yb = [t.to(device) for t in batch]
                logits = model(imgb)
            else:
                xb, yb = [t.to(device) for t in batch]
                logits = model(xb)
            probs = torch.sigmoid(logits).cpu().numpy()
            all_probs.extend(probs)
            all_labels.extend(yb.cpu().numpy())
    try:
        return roc_auc_score(all_labels, all_probs)
    except ValueError:
        return 0.0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="data/processed")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=128)
    parser.add_argument("--model", choices=["gru", "cnn", "fusion"], default="fusion")
    args = parser.parse_args()
    train(args)
