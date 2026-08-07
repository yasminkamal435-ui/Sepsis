"""
فرع الـ Deep Learning الأساسي: BiGRU + Attention على السلسلة الزمنية الخام
(كل القراءات الحيوية والمعملية ساعة بساعة) — يلتقط الاتجاه العام لتدهور
حالة المريض عبر الزمن.
"""
import torch
import torch.nn as nn


class TemporalAttention(nn.Module):
    """Attention تُبرز الساعات الأكثر دلالة على تطور الحالة نحو الإنتان"""

    def __init__(self, hidden_dim: int):
        super().__init__()
        self.attn = nn.Linear(hidden_dim, 1)

    def forward(self, hidden_states):  # (B, T, H)
        scores = self.attn(hidden_states).squeeze(-1)      # (B, T)
        weights = torch.softmax(scores, dim=1).unsqueeze(-1)  # (B, T, 1)
        context = torch.sum(weights * hidden_states, dim=1)   # (B, H)
        return context, weights.squeeze(-1)


class SepsisGRUModel(nn.Module):
    def __init__(self, n_features: int, hidden_dim: int = 128, num_layers: int = 2, dropout: float = 0.3):
        super().__init__()
        self.gru = nn.GRU(
            input_size=n_features,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.attention = TemporalAttention(hidden_dim * 2)
        self.classifier = nn.Sequential(
            nn.LayerNorm(hidden_dim * 2),
            nn.Linear(hidden_dim * 2, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 1),
        )

    def forward(self, x, return_embedding: bool = False):  # x: (B, T, F)
        out, _ = self.gru(x)
        context, attn_weights = self.attention(out)
        logits = self.classifier(context).squeeze(-1)
        if return_embedding:
            return logits, context, attn_weights
        return logits
