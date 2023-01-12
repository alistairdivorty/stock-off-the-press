import Candlestick from '@/components/Candlestick';

const Hero = () => (
    <div className="h-screen bg-black flex justify-end w-full text-white p-10 font-montserrat">
        <div className="relative max-w-7xl sm:flex-1 sm:mr-10 text-white">
            <div className="absolute inset-y-1/4 transform -translate-y-20 z-10 max-w-lg">
                <h1
                    className="max-w-4xl text-4xl sm:text-6xl font-semibold"
                    style={{ lineHeight: '1.4' }}
                >
                    AI powered news analysis.
                </h1>
                <p
                    className="text-zinc-300 text-xl sm:text-3xl font-medium pt-7"
                    style={{ lineHeight: '1.9' }}
                >
                    A model for predicting the effect of news stories on stock
                    prices.
                </p>
            </div>
            <Candlestick className="fill-blue-700 opacity-90 w-full h-full" />
        </div>
    </div>
);

export default Hero;
