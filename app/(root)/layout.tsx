import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import MobileNav from "@/components/MobileNav";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  //this data will be fetched from a real user
  const loggedIn = await getLoggedInUser();

  //we use redirect instead of router.push because this is a server component and we want to still be that way
  if(!loggedIn) redirect('/sign-in');


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
