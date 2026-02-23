/** @type {import('next').NextConfig} */




let unOptimized = true;


if (process.env.MODE === "pro") {
  unOptimized = false;

}




const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,


  images: {
    unoptimized: unOptimized,   //false in in live server make webp images 
    qualities: [60, 70, 75, 90, 100],
    remotePatterns: [

      { hostname: "admin.atlanticlubes.com", protocol: "https" },
      { hostname: "admin.bathstore.pk", protocol: "https" },
      { hostname: "bathstore.com.pk", protocol: "https" },

      { hostname: "localhost", protocol: "http" },
      //{ hostname: "192.168.1.100", protocol: "http" } // your server IP
    ],

  },
};

export default nextConfig;
