import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  currentImageUrl: string;
  onImageUploaded: (url: string) => void;
}

const UPLOAD_API_URL = "https://functions.poehali.dev/2ff77aef-179a-445e-8e7e-744cb90ea2e8";

const ImageUpload = ({ currentImageUrl, onImageUploaded }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите изображение",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Ошибка",
        description: "Размер файла не должен превышать 5 МБ",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const base64Image = e.target?.result as string;
        setPreviewUrl(base64Image);

        try {
          const response = await fetch(UPLOAD_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64Image,
              filename: file.name,
            }),
          });

          if (!response.ok) throw new Error('Upload failed');

          const data = await response.json();
          
          onImageUploaded(data.url);
          
          toast({
            title: "Успешно!",
            description: "Изображение загружено",
          });
        } catch (error) {
          toast({
            title: "Ошибка",
            description: "Не удалось загрузить изображение",
            variant: "destructive",
          });
          setPreviewUrl(currentImageUrl);
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось прочитать файл",
        variant: "destructive",
      });
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl("");
    onImageUploaded("");
    toast({
      title: "Успешно!",
      description: "Изображение удалено",
    });
  };

  return (
    <div className="space-y-4">
      <Label>Изображение мероприятия</Label>
      
      <div className="flex gap-4">
        <div className="relative">
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <label htmlFor="image-upload">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              className="cursor-pointer"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              <Icon name="Upload" size={16} className="mr-2" />
              {uploading ? "Загрузка..." : "Загрузить изображение"}
            </Button>
          </label>
        </div>

        {previewUrl && (
          <Button
            type="button"
            variant="outline"
            onClick={handleRemove}
            disabled={uploading}
          >
            <Icon name="Trash2" size={16} className="mr-2" />
            Удалить
          </Button>
        )}
      </div>

      {previewUrl && (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
              <div className="text-white font-medium">Загрузка...</div>
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-gray-500">
        Поддерживаются форматы: JPG, PNG, GIF. Максимальный размер: 5 МБ
      </p>
    </div>
  );
};

export default ImageUpload;
