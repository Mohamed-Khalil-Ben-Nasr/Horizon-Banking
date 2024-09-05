'use client'
import Link from 'next/link'
import React, { useState } from 'react'
import Image from "next/image"

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input" 
import CustomInput from './CustomInput'
import { authFormSchema } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getLoggedInUser, signIn, signUp } from '@/lib/actions/user.actions'
import PlaidLink from './PlaidLink'


    const AuthForm = ({type}:{type:string}) => {
        const router = useRouter()
        const [user, setUser] = useState(null)

        const [isLoading, setIsLoading] = useState(false)

        const formSchema = authFormSchema(type);
        
        // 1. Define your form.
        const form = useForm<z.infer<typeof formSchema>>({
            resolver: zodResolver(formSchema),
            defaultValues: {
            email: "",
            password:""
            },
        })

        // 2. Define a submit handler.
        const onSubmit= async (data: z.infer<typeof formSchema>) => {
            setIsLoading(true)
            try{

                // Sign up with Appwrite and create plaid link token to start linking our bank account
                if (type === 'sign-up') {
                    const userData = {
                        firstName: data.firstName!,
                        lastName: data.lastName!,
                        address1: data.address1!,
                        city: data.city!,
                        state: data.state!,
                        postalCode: data.postalCode!,
                        dateOfBirth: data.dateOfBirth!,
                        ssn: data.ssn!,
                        email: data.email,
                        password:data.password,
    
                    }

                    //all the new user data is already available in the "data"
                    const newUser = await signUp(userData);
                    setUser(newUser);
                }

                if (type === 'sign-in') { 
                    const response = await signIn({
                        email: data.email,
                        password: data.password
                    })
                    if (response){
                        //if response is successfull navigate to home page
                        router.push('/')
                    }
                }
            } catch(error) {
                console.log(error);
            } finally{
                //no matter if we succeed or fail
                setIsLoading(false);
            } 
        }

    return (
        <section className='auth-form'>
            <header className='flex flex-col gap-5 md:gap-8'>
                <Link href="/" 
                    className='
                    cursor-pointer
                    items-center
                    gap-1 flex px-4'>
                        <Image src="/icons/logo.svg"
                        width={34}
                        height={34}
                        alt="Horizon Logo"/>
                        <h1 className='text-26 font-ibm-plex-serif font-bold text-black-1'>Horizon</h1>
                </Link>
                <div className='flex flex-col gap-1 md:gap-3'>
                    <h1 className='text-24 lg:text-36 font-semibold text-gray-900'>
                        {
                            user
                            ? 'Link Account'
                            : type === 'sign-in'
                            ? 'Sign In'
                            : 'Sign Up'
                        }
                        <p className='text-16 font-normal text-gray-600'>
                            {
                                user
                                ? 'Link your account to get started'
                                : 'Please enter your details'
                            }
                        </p>
                    </h1>
                </div>
            </header>
            {user ?(
                <div className='flex flex-col gap-4'>
                    {/*plaid link component to link our bank account */}
                    <PlaidLink user={user} variant="primary"></PlaidLink>
                </div>
            ):(
                <>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            {/*these extra input fields will render if our form is for sign up*/}
                            {
                                type === "sign-up" &&(
                                    <>
                                        <div className='flex gap-4'>
                                            <CustomInput
                                                control={form.control}
                                                name="firstName"
                                                label="First Name"
                                                placeholder="Enter your first name"
                                            ></CustomInput>
                                            <CustomInput
                                                control={form.control}
                                                name="lastName"
                                                label="Last Name"
                                                placeholder="Enter your last name"
                                            ></CustomInput>
                                        </div>
                                        
                                        <CustomInput
                                            control={form.control}
                                            name="address1"
                                            label="Address"
                                            placeholder="Enter your specific address"
                                        ></CustomInput>

                                        <CustomInput
                                            control={form.control}
                                            name="city"
                                            label="City"
                                            placeholder="Enter your specific city"
                                        ></CustomInput>

                                        <div className='flex gap-4'>
                                            <CustomInput
                                                control={form.control}
                                                name="state"
                                                label="State"
                                                placeholder="Example: NY"
                                            ></CustomInput>
                                            <CustomInput
                                                control={form.control}
                                                name="postalCode"
                                                label="Postal Code"
                                                placeholder="Example: 11101"
                                            ></CustomInput>
                                        </div>

                                        <div className='flex gap-4'>
                                            <CustomInput
                                                control={form.control}
                                                name="dateOfBirth"
                                                label="Date of Birth"
                                                placeholder="YYYY-MM-DD"
                                            ></CustomInput>
                                            <CustomInput
                                                control={form.control}
                                                name="ssn"
                                                label="SSN"
                                                placeholder="Example: 1234"
                                            ></CustomInput>
                                        </div>                            
                                    </>
                                )
                            }

                            <CustomInput
                                control={form.control}
                                name="email"
                                label="Email"
                                placeholder="Enter your email"
                            ></CustomInput>

                            <CustomInput
                                control={form.control}
                                name="password"
                                label="Password"
                                placeholder="Enter your password"
                            ></CustomInput>
                            {/*add disabled if its loading so that the user doesnt click the button multiple times after submitting and spam the database */}
                            <div className='flex flex-col gap-4'>
                                <Button type="submit" className='form-btn' disabled={isLoading}>
                                    {
                                        isLoading ? (
                                            <>
                                                <Loader2 size={20} className='animate-spin'/>&nbsp;
                                            Loading...
                                            </>
                                        ): type === 'sign-in' 
                                        ? 'Sign In ' : 'Sign Up'
                                    }
                                </Button> 
                            </div>             
                        </form>
                    </Form>
                    <footer className='flex justify-center gap-1'>
                        <p className="text-14 font-normal text-gray-600">{
                        type === 'sign-in'
                        ? "Don't have an account?"
                        : "Already have an account"
                        }</p>
                        <Link href={type === 'sign-in' ? '/sign-up' : '/sign-in'} className='form-link'>
                            {type === 'sign-in' ? 
                            'Sign up' 
                            : 'Sign in'}
                        </Link>
                    </footer>
                </>
            )}
        </section>
    )
    }

    export default AuthForm