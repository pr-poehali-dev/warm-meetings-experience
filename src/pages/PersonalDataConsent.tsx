import React from "react";

const PersonalDataConsent = () => {
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-serif text-nature-forest mb-8 text-center">
          Согласие на обработку персональных данных
        </h1>

        <div className="prose prose-lg max-w-none space-y-6 text-nature-forest/90">
          <p className="leading-relaxed">
            Настоящим, я именуемый (-ая) в дальнейшем «Субъект персональных данных» и/или «Клиент», подтверждаю, что даю согласие на обработку моих персональных данных Индивидуальному Предпринимателю Чикину Дмитрию Сергеевичу, ОГРНИП 321774600501510, ИНН 771916365140, адрес: 105187, Россия, г. Москва, ул. Фортунатовская, д. 31/35 кв. 98 (далее «Оператор»), на условиях, описанных ниже:
          </p>

          <div className="space-y-6 mt-8">
            <section className="bg-nature-cream/30 p-6 rounded-lg">
              <h2 className="text-xl font-serif text-nature-forest mb-4">
                1. Перечень моих персональных данных, представленных на обработку которых я даю согласие:
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>фамилия, имя, отчество;</li>
                <li>контактная информация: телефон, адрес электронной почты, Telegram;</li>
                <li>дата рождения.</li>
              </ul>
              <p className="mt-4 text-sm italic">(далее – «Персональные данные»)</p>
            </section>

            <section>
              <h2 className="text-xl font-serif text-nature-forest mb-4">
                2. Цель обработки персональных данных
              </h2>
              <p className="leading-relaxed">
                Оператор осуществляет обработку моих персональных данных в целях оказания услуг, реализации товаров Оператора.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif text-nature-forest mb-4">
                3. Способ обработки
              </h2>
              <p className="leading-relaxed">
                Оператор вправе обрабатывать мои Персональные данные смешанным способом, то есть как с использованием средств автоматизации, так и без использования средств автоматизации.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif text-nature-forest mb-4">
                4. Действия с персональными данными
              </h2>
              <p className="leading-relaxed">
                Оператор вправе осуществлять следующие действия с указанными выше Персональными данными: сбор, запись, систематизация, накопление, использование, хранение, уточнение (обновление, изменение), извлечение, уничтожение.
              </p>
            </section>

            <section className="bg-nature-sage/10 p-6 rounded-lg">
              <h2 className="text-xl font-serif text-nature-forest mb-4">
                5. Срок действия и отзыв согласия
              </h2>
              <p className="leading-relaxed mb-4">
                Настоящее согласие действует <strong>10 (десять) лет</strong> с момента его предоставления. Субъект персональных данных вправе отозвать настоящее согласие в любой момент, направив письменное уведомление Оператору по адресу регистрации, указанному в выше и/или по адресу электронной почты{" "}
                <a href="mailto:info@sparcom.ru" className="text-nature-brown hover:underline">
                  info@sparcom.ru
                </a>
                .
              </p>
              <p className="leading-relaxed text-sm">
                В случае отзыва согласия на обработку персональных данных Оператор вправе продолжить обработку персональных данных только в случаях, предусмотренных законом.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif text-nature-forest mb-4">
                6. Принципы обработки
              </h2>
              <p className="leading-relaxed">
                Обработка персональных данных осуществляется в соответствии принципами и условиями обработки персональных данных компании «СПАРКОМ», изложенными в{" "}
                <a 
                  href="/privacy-policy" 
                  className="text-nature-brown hover:underline"
                >
                  Политике обработки персональных данных
                </a>
                , постоянно размещенной в информационно-телекоммуникационной сети «Интернет».
              </p>
            </section>

            <section className="bg-nature-brown/5 p-6 rounded-lg border-l-4 border-nature-brown">
              <h2 className="text-xl font-serif text-nature-forest mb-4">
                7. Гарантии субъекта персональных данных
              </h2>
              <p className="leading-relaxed">
                Я гарантирую, что предоставленная мной информация является полной, точной и достоверной, заполнена мной в отношении себя лично, все действия по предоставлению согласия совершены непосредственно мной.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-nature-brown/20">
            <div className="bg-nature-cream/50 p-6 rounded-lg">
              <h3 className="text-lg font-serif text-nature-forest mb-3">Контактная информация оператора:</h3>
              <div className="space-y-2 text-nature-forest/80">
                <p><strong>ИП Чикин Дмитрий Сергеевич</strong></p>
                <p>ОГРНИП: 321774600501510</p>
                <p>ИНН: 771916365140</p>
                <p>Адрес: 105187, Россия, г. Москва, ул. Фортунатовская, д. 31/35, кв. 98</p>
                <p>
                  Email: <a href="mailto:info@sparcom.ru" className="text-nature-brown hover:underline">info@sparcom.ru</a>
                </p>
                <p>
                  Телефон: <a href="tel:+79265370200" className="text-nature-brown hover:underline">+7 (926) 537-02-00</a>
                </p>
              </div>
            </div>
          </div>

          <section className="mt-8 pt-8 border-t border-nature-brown/20">
            <p className="text-sm text-nature-forest/70 text-center">
              © СПАРКОМ. Все права защищены.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PersonalDataConsent;