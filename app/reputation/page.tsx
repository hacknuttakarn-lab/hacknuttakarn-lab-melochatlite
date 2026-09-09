"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { getCurrentUser } from "@/lib/supabase/browser";
export default function MyReputationPage(){const router=useRouter();useEffect(()=>{void getCurrentUser().then(user=>router.replace(user?`/reputation/${user.id}`:"/login"))},[router]);return <main style={{minHeight:"100vh",background:"var(--background)"}}><Header/></main>}
