import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import MobileNav from "@/components/MobileNav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  //this data will be fetched from a real user
  const loggedIn = {firstName: 'Mohamed Khalil', lastName: 'Ben Nasr'};


  return (
   <main className="flex h-screen w-full font-inter">
    <Sidebar user={loggedIn}/>
    {/*if we are on mobile devices we need to render a mobile nav bar*/}
    <div className="flex size-full flex-col">
      <div className="root-layout">
        <Image src="/icons/logo.svg"  width={30} height={30} alt="logo"/>
        <div>
          <MobileNav user={loggedIn}/>
        </div>
      </div>
      {children}
    </div>
   </main>
  );
}
