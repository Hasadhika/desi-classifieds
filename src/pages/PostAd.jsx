import React from "react";
import PostAdForm from "../components/post/PostAdForm";

export default function PostAd() {
  return (
    <div className="page-enter min-h-screen bg-[#F8F8F8]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A] tracking-tight">Post Your Ad</h1>
          <p className="text-gray-500 mt-2">Reach thousands of community members across Canada</p>
        </div>
        <PostAdForm />
      </div>
    </div>
  );
}