import PaddingContainer from '@/app/components/shared/PaddingContainer'
import React from 'react'
import Link from "next/link";
import Header from '@/app/components/layouts/client/Header';

export default function dashboard() {


    return (
        <>
            {/* header */}
            <Header />
            <div className='  flex justify-center items-center '>
                <div className=''> profile image and Welcome with first name</div>
                <div className=''> manue</div>
                <div className=''>Logo</div>
            </div>

        </>

    )
}
