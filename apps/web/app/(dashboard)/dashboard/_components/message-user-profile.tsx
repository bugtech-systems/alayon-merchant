"use client";

import { Download, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ... same User interface ...

interface UserProfileProps {
  user: User;
  onClose: () => void;
}

export function UserProfile({ user, onClose }: UserProfileProps) {
  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header with close button */}
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">Profile</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Profile Header */}
        <div className="text-center">
          <div className="relative inline-block">
            <Avatar className="mx-auto h-20 w-20">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-lg">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="absolute right-1 bottom-1 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">{user.name}</h2>
          <p className="text-sm text-green-600">{user.status}</p>
        </div>

        {/* Bio Section */}
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium text-gray-900">Bio</h3>
          <p className="text-sm leading-relaxed text-gray-600">{user.bio}</p>
        </div>

        <Separator className="my-6" />

        {/* Contact Information */}
        <div className="space-y-4">
          <div>
            <h3 className="mb-1 text-sm font-medium text-gray-900">Email</h3>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-medium text-gray-900">Phone</h3>
            <p className="text-sm text-gray-600">{user.phone}</p>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-medium text-gray-900">Location</h3>
            <p className="text-sm text-gray-600">{user.location}</p>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Shared Files */}
        <div>
          <h3 className="mb-4 text-sm font-medium text-gray-900">Shared Files</h3>
          <div className="space-y-3">
            {user.sharedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg p-2 hover:bg-gray-50"
              >
                <span className="truncate text-sm text-gray-700">{file.name}</span>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}