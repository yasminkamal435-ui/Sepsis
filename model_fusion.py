"""
نموذج الدمج النهائي (Fusion Model): يجمع بين
  1) embedding من BiGRU+Attention  (فرع الـ Deep Learning الزمني)
  2) embedding من CNN على الصور    (فرع الـ Computer Vision)
ويطلع قرار واحد أدق من أي فرع لوحده — وده اللي بيتنشر فعليًا خلف الـ API.
"""
import torch
import torch.nn as nn

from model_lstm import SepsisGRUModel
from model_cnn import SepsisCNNModel


class SepsisFusionModel(nn.Module):
    def __init__(self, n_features: int, gru_hidden: int = 128, cnn_embed: int = 128, dropout: float = 0.3):
        super().__init__()
        self.gru_branch = SepsisGRUModel(n_features, hidden_dim=gru_hidden)
        self.cnn_branch = SepsisCNNModel(embed_dim=cnn_embed)

        fusion_dim = gru_hidden * 2 + cnn_embed
        self.fusion_head = nn.Sequential(
            nn.LayerNorm(fusion_dim),
            nn.Linear(fusion_dim, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def forward(self, x_seq, x_img):
        """
        x_seq: (B, T, F)  السلسلة الزمنية الخام لفرع الـ GRU
        x_img: (B, 2, T, T) الصورة الناتجة من GAF/RP لفرع الـ CNN
        """
        _, gru_emb, attn_weights = self.gru_branch(x_seq, return_embedding=True)
        _, cnn_emb = self.cnn_branch(x_img, return_embedding=True)

        combined = torch.cat([gru_emb, cnn_emb], dim=1)
        logits = self.fusion_head(combined).squeeze(-1)
        return logits, attn_weights

    def predict_proba(self, x_seq, x_img):
        with torch.no_grad():
            logits, _ = self.forward(x_seq, x_img)
            return torch.sigmoid(logits)
