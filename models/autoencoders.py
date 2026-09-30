# Construct 3 — Autoencoders on Fashion-MNIST (remake)
# Fresh, minimal implementation. CPU friendly.

import random
import numpy as np
import torch
import torch.nn as nn


def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.backends.cudnn.deterministic = False


class FCAutoencoder(nn.Module):
    """Fully connected autoencoder for 28x28 grayscale images.

    Encoder: 784 -> 512 -> 256 -> latent
    Decoder: latent -> 256 -> 512 -> 784, final sigmoid.
    """

    def __init__(self, latent_dim: int = 32, hidden=(512, 256),
                 use_bn: bool = True, dropout: float = 0.1):
        super().__init__()
        self.latent_dim = latent_dim

        enc_layers = []
        prev = 784
        for h in hidden:
            enc_layers.append(nn.Linear(prev, h))
            if use_bn:
                enc_layers.append(nn.BatchNorm1d(h))
            enc_layers.append(nn.ReLU())
            if dropout > 0:
                enc_layers.append(nn.Dropout(dropout))
            prev = h
        enc_layers.append(nn.Linear(prev, latent_dim))
        self.encoder = nn.Sequential(*enc_layers)

        dec_layers = []
        prev = latent_dim
        for h in reversed(hidden):
            dec_layers.append(nn.Linear(prev, h))
            if use_bn:
                dec_layers.append(nn.BatchNorm1d(h))
            dec_layers.append(nn.ReLU())
            if dropout > 0:
                dec_layers.append(nn.Dropout(dropout))
            prev = h
        dec_layers.append(nn.Linear(prev, 784))
        dec_layers.append(nn.Sigmoid())
        self.decoder = nn.Sequential(*dec_layers)

    def encode(self, x):
        return self.encoder(x.view(x.size(0), -1))

    def decode(self, z):
        return self.decoder(z).view(z.size(0), 1, 28, 28)

    def forward(self, x):
        return self.decode(self.encode(x))


class ConvAutoencoder(nn.Module):
    """Small convolutional autoencoder for 28x28 grayscale images.

    Encoder: 1x28x28 -> 32x14x14 -> 64x7x7 -> latent
    Decoder: latent -> 64x7x7 -> 32x14x14 -> 1x28x28, final sigmoid.
    """

    def __init__(self, latent_dim: int = 32, dropout: float = 0.1):
        super().__init__()
        self.latent_dim = latent_dim

        self.enc_conv = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, stride=2, padding=1),  # 14x14
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),  # 7x7
            nn.BatchNorm2d(64),
            nn.ReLU(),
        )
        self.enc_fc = nn.Linear(64 * 7 * 7, latent_dim)
        self.dec_fc = nn.Linear(latent_dim, 64 * 7 * 7)
        self.dec_conv = nn.Sequential(
            nn.ConvTranspose2d(64, 32, kernel_size=4, stride=2, padding=1),  # 14x14
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.ConvTranspose2d(32, 1, kernel_size=4, stride=2, padding=1),   # 28x28
            nn.Sigmoid(),
        )

    def encode(self, x):
        h = self.enc_conv(x)
        return self.enc_fc(h.view(h.size(0), -1))

    def decode(self, z):
        h = self.dec_fc(z).view(z.size(0), 64, 7, 7)
        return self.dec_conv(h)

    def forward(self, x):
        return self.decode(self.encode(x))


class DenoisingAutoencoder(nn.Module):
    """Wraps any autoencoder: corrupts the input with Gaussian noise,
    trains the backbone to reconstruct the clean target."""

    def __init__(self, backbone: nn.Module, noise_std: float = 0.3):
        super().__init__()
        self.backbone = backbone
        self.noise_std = noise_std

    def corrupt(self, x):
        return torch.clamp(x + torch.randn_like(x) * self.noise_std, 0.0, 1.0)

    def forward(self, x):
        return self.backbone(self.corrupt(x))

    def encode(self, x):
        return self.backbone.encode(self.corrupt(x))

    def decode(self, z):
        return self.backbone.decode(z)


def count_params(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)
