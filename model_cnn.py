"""
فرع الـ Computer Vision: شبكة CNN صغيرة على شاكلة ResNet تتعلم من الصور
الناتجة في timeseries_to_image.py (Gramian Angular Field + Recurrence Plot).
"""
import torch
import torch.nn as nn


class ConvBlock(nn.Module):
    def __init__(self, in_ch, out_ch, stride=1):
        super().__init__()
        self.conv = nn.Conv2d(in_ch, out_ch, kernel_size=3, stride=stride, padding=1, bias=False)
        self.bn = nn.BatchNorm2d(out_ch)
        self.act = nn.ReLU(inplace=True)

    def forward(self, x):
        return self.act(self.bn(self.conv(x)))


class ResidualBlock(nn.Module):
    def __init__(self, channels):
        super().__init__()
        self.block1 = ConvBlock(channels, channels)
        self.block2 = nn.Sequential(
            nn.Conv2d(channels, channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(channels),
        )
        self.act = nn.ReLU(inplace=True)

    def forward(self, x):
        residual = x
        out = self.block1(x)
        out = self.block2(out)
        return self.act(out + residual)


class SepsisCNNModel(nn.Module):
    """
    مدخل: صور (B, 2, T, T) الناتجة من GAF + Recurrence Plot
    مخرج: embedding + logits (يستخدم embedding في نموذج الدمج model_fusion.py)
    """

    def __init__(self, in_channels: int = 2, embed_dim: int = 128, dropout: float = 0.3):
        super().__init__()
        self.stem = ConvBlock(in_channels, 32)
        self.layer1 = nn.Sequential(ConvBlock(32, 64), ResidualBlock(64))
        self.layer2 = nn.Sequential(ConvBlock(64, 128, stride=2), ResidualBlock(128))
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.embed = nn.Linear(128, embed_dim)
        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(embed_dim, 1),
        )

    def forward(self, x, return_embedding: bool = False):
        h = self.stem(x)
        h = self.layer1(h)
        h = self.layer2(h)
        h = self.pool(h).flatten(1)
        emb = torch.relu(self.embed(h))
        logits = self.classifier(emb).squeeze(-1)
        if return_embedding:
            return logits, emb
        return logits
