from ultralytics import YOLO

if __name__ == "__main__":
    model = YOLO("yolov8s-cls.pt")

    model.train(
        data="PlantVillage",
        epochs=5,
        imgsz=224,
        batch=32,
        device=0,
        workers=0
    )