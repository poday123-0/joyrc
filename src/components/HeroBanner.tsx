import heroWoman from "@/assets/hero-woman.png";

const HeroBanner = () => {
  return (
    <div className="relative rounded-3xl overflow-hidden gradient-card h-44 md:h-56">
      <div className="absolute inset-0 flex">
        {/* Content */}
        <div className="flex-1 p-5 flex flex-col justify-center z-10">
          <h2 className="text-lg md:text-xl font-semibold text-foreground leading-tight">
            A World of
            <br />
            Living Colors
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Flat 20% Off on Selected Fish
          </p>
          <button className="mt-3 bg-primary text-primary-foreground text-xs font-medium px-4 py-2 rounded-full w-fit shadow-soft hover:opacity-90 transition-opacity">
            Shop Now
          </button>
        </div>

        {/* Image */}
        <div className="relative w-40 md:w-52 flex-shrink-0">
          <img
            src={heroWoman}
            alt="Woman with fishbowl"
            className="absolute bottom-0 right-0 h-full object-cover object-bottom"
          />
        </div>
      </div>

      {/* Pagination dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        <div className="w-5 h-1.5 rounded-full bg-primary"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"></div>
      </div>
    </div>
  );
};

export default HeroBanner;
