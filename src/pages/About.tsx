import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="relative h-[60vh] md:h-[70vh]">
        <img 
          src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/248a9bc4-58d3-4fe1-91bf-87b900ec084a.jpg"
          alt="СПАРКОМ"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-semibold text-white mb-6 leading-tight tracking-tight">
              СПАРКОМ
            </h1>
            <p className="text-lg md:text-xl text-neutral-300 font-light">
              Оффлайн-сообщество с регулярными встречами
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-20">
        
        <div className="space-y-8 text-lg text-neutral-700 leading-relaxed mb-20">
          <p>
            СПАРКОМ — оффлайн-сообщество с регулярными встречами.
          </p>
          <p>
            Мы создаём спокойное и предсказуемое пространство с чёткими правилами и ролями.
          </p>
          <p>
            Клуб подходит тем, кто ценит формат, границы и уважительное взаимодействие.
          </p>
          <p>
            СПАРКОМ не является развлекательным или нетворкинг-проектом.
          </p>
          <p>
            Участие строится на модели «в складчину» и фиксированном организационном вкладе.
          </p>
          <p>
            Доступ в сообщество возможен после первого ознакомительного участия и принятия правил.
          </p>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={() => navigate('/rules')}
            className="w-full h-14 text-base font-normal bg-neutral-900 hover:bg-neutral-800 text-white"
          >
            Правила клуба
          </Button>
          
          <Button 
            onClick={() => navigate('/participation')}
            className="w-full h-14 text-base font-normal bg-neutral-900 hover:bg-neutral-800 text-white"
          >
            Как устроено участие
          </Button>
          
          <Button 
            onClick={() => navigate('/formats')}
            className="w-full h-14 text-base font-normal bg-neutral-900 hover:bg-neutral-800 text-white"
          >
            Формат встреч
          </Button>
        </div>

      </div>
    </div>
  );
}
