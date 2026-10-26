import sys

packages = ["torch", "torchvision", "onnx", "onnxruntime", "numpy", "PIL", "sklearn"]
for pkg in packages:
    try:
        mod = __import__(pkg)
        ver = getattr(mod, "__version__", "installed")
        print(f"{pkg}: {ver}")
    except ImportError:
        print(f"{pkg}: NOT INSTALLED")
