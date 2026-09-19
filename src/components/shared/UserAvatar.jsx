import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function UserAvatar({ name, email, className = "" }) {
  const getInitials = (nameOrEmail) => {
    if (!nameOrEmail) return "U";

    if (nameOrEmail.includes("@")) {
      return nameOrEmail.charAt(0).toUpperCase();
    }

    const parts = nameOrEmail.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return nameOrEmail.charAt(0).toUpperCase();
  };

  const getColorFromEmail = (email) => {
    if (!email) return "bg-gray-500";

    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-orange-500",
      "bg-cyan-500"
    ];

    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials(name || email);
  const bgColor = getColorFromEmail(email);

  return (
    <Avatar className={className}>
      <AvatarFallback className={`${bgColor} text-white font-semibold`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
