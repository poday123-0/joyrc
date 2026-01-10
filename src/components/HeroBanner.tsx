import { Link } from "react-router-dom";
import rcCarRed from "@/assets/rc-car-red.png";

const HeroBanner = () => {
  return (
    <div className="relative rounded-3xl overflow-hidden gradient-card h-44 md:h-56 lg:h-72">
      <div className="absolute inset-0 flex">
        {/* Content */}
        <div className="flex-1 p-5 lg:p-8 flex flex-col justify-center z-10">
          <h2 className="text-lg md:text-xl lg:text-3xl font-semibold text-foreground leading-tight">
            Ultimate RC
            <br />
            Experience
          </h2>
          <p className="text-xs md:text-sm lg:text-base text-muted-foreground mt-1 lg:mt-2">
            Flat 20% Off on Selected Toys
          </p>
          <Link to="/categories">
            <button className="mt-3 lg:mt-4 bg-primary text-primary-foreground text-xs lg:text-sm font-medium px-4 lg:px-6 py-2 lg:py-2.5 rounded-full w-fit shadow-soft hover:opacity-90 transition-opacity">
              Shop Now
            </button>
          </Link>
        </div>

        {/* Image */}
        <div className="relative w-44 md:w-56 lg:w-80 flex-shrink-0 flex items-center justify-center">
          <img
            src={rcCarRed}
            alt="RC Car"
            className="w-36 h-36 md:w-44 md:h-44 lg:w-64 lg:h-64 object-contain animate-float"
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
