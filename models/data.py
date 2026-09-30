# Construct 3 — data loading (fresh implementation)
# Fashion-MNIST, one-class anomaly setup: class 5 (Sandal) is the anomaly,
# never seen during training or validation.

from torch.utils.data import DataLoader, Subset, random_split
from torchvision import datasets, transforms

ANOMALY_CLASS = 5  # Sandal
CLASSES = ['T-shirt/top', 'Trouser', 'Pullover', 'Dress', 'Coat',
           'Sandal', 'Shirt', 'Sneaker', 'Bag', 'Ankle boot']


def load_fashion_mnist(root: str = "data"):
    tf = transforms.Compose([transforms.ToTensor()])
    train_full = datasets.FashionMNIST(root=root, train=True, download=True, transform=tf)
    test_full = datasets.FashionMNIST(root=root, train=False, download=True, transform=tf)
    return train_full, test_full


def _idx_where(dataset, cond):
    targets = dataset.targets
    return [i for i, t in enumerate(targets) if cond(int(t))]


def build_splits(root="data", train_n=10000, val_n=2000, seed=42):
    """Returns dict of DataLoaders: train, val, test_normal, test_anomaly."""
    import torch
    g = torch.Generator().manual_seed(seed)

    train_full, test_full = load_fashion_mnist(root)

    normal_train_idx = _idx_where(train_full, lambda t: t != ANOMALY_CLASS)
    normal_train_idx = normal_train_idx[:train_n + val_n]

    # 10% validation split
    sub = Subset(train_full, normal_train_idx)
    train_ds, val_ds = random_split(sub, [train_n, val_n], generator=g)

    test_normal_idx = _idx_where(test_full, lambda t: t != ANOMALY_CLASS)
    test_anomaly_idx = _idx_where(test_full, lambda t: t == ANOMALY_CLASS)
    test_normal = Subset(test_full, test_normal_idx)
    test_anomaly = Subset(test_full, test_anomaly_idx)

    def dl(ds, shuffle, bs=256):
        return DataLoader(ds, batch_size=bs, shuffle=shuffle, num_workers=0)

    return {
        "train": dl(train_ds, shuffle=True),
        "val": dl(val_ds, shuffle=False),
        "test_normal": dl(test_normal, shuffle=False),
        "test_anomaly": dl(test_anomaly, shuffle=False),
    }
