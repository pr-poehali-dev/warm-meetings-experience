export default function PersonalStorySection() {
  return (
    <section className="py-20 px-6 bg-nature-beige">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <h2 className="text-4xl md:text-5xl font-serif font-light text-nature-forest mb-8">
              Почему я веду вас в этот ритуал?
            </h2>
            <div className="space-y-6 text-lg text-nature-forest/80 leading-relaxed">
              <p>Я не «услуга». Я проводник.</p>
              <p>
                Мои руки помнят узлы тысячи веников, а сердце — истории сотен встреч.
              </p>
              <p>
                Я верю, что пар смывает не только токсины, но и шелуху суеты, 
                обнажая наше настоящее «Я».
              </p>
              <p className="font-medium text-nature-forest">
                Моя миссия — дать вам пространство, где вы сможете встретиться с собой и другими без страха и оценок.
              </p>
              <p className="text-nature-brown font-medium italic">
                Ваша трансформация — мой главный результат.
              </p>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <img 
              src="https://cdn.poehali.dev/files/4a037c7b-ace8-4491-8ec8-5bd4cf1f267b.jpg"
              alt="Дмитрий Чикин"
              className="w-full rounded-2xl shadow-lg animate-scale-in"
            />
          </div>
        </div>
      </div>
    </section>
  );
}