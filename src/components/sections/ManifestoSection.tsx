export default function ManifestoSection() {
  return (
    <section className="py-20 px-6 bg-nature-cream">
      <div className="max-w-4xl mx-auto text-center animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-serif font-light text-nature-forest mb-12">
          Здесь нет случайных гостей.
        </h2>
        <div className="prose prose-lg max-w-3xl mx-auto text-nature-forest/80 leading-relaxed">
          <p className="text-xl mb-6">
            «Это место родилось из моей уверенности, что настоящая встреча — это искусство, 
            которое мы почти забыли.
          </p>
          <p className="text-xl mb-6">
            Я, Дмитрий Чикин, создал «Тёплые Встречи» не как сервис, а как дверь в то состояние, 
            где время замедляется, маски остаются на вешалке, а диалог течёт как медленный, глубокий пар.
          </p>
          <p className="text-xl font-medium text-nature-forest">
            Если вы ищете не просто баню, а место силы для общения — вы пришли по адресу.»
          </p>
        </div>
      </div>
    </section>
  );
}