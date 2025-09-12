import Icon from "@/components/ui/icon";

export default function AtmosphereGallerySection() {
  return (
    <section className="py-20 px-6 bg-nature-cream">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl font-serif font-light text-nature-forest mb-16">
          Атмосфера встреч
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="aspect-square bg-nature-cream rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <img 
              src="/img/ac26bab8-6d80-4a7f-8e75-3413d651f39c.jpg"
              alt="Чайная церемония"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-square bg-nature-cream rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <img 
              src="/img/6f1b0345-c153-4c3c-b7a3-589f1835b717.jpg"
              alt="Пространство сауны"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-square bg-nature-cream rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="text-center p-8">
              <Icon name="Camera" size={48} className="text-nature-brown mx-auto mb-4" />
              <p className="text-nature-forest/60 italic">
                Моменты истинной близости<br />
                живут в сердце, а не в кадре
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}