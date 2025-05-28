import { Button } from "@/components/ui/button";
import { Linkedin, Twitter, Instagram } from "lucide-react";
import Link from "next/link";

export default function Community() {
  return (
    <section id="community" className="py-20 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Find and connect with me</h2>
          <p className="text-gray-400 mb-8">
            Ready to transform your content creation process? Let's connect and
            explore how AI can elevate your entrepreneurial journey and content
            strategy.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="https://www.linkedin.com/in/christian-vivas-468371165/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full">
                <Linkedin className="mr-2 h-5 w-5" />
                LinkedIn
              </Button>
            </Link>
            <Link
              href="https://www.instagram.com/chrisvivas.ai/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full">
                <Instagram className="mr-2 h-5 w-5" />
                Instagram
              </Button>
            </Link>
            <Link
              href="https://x.com/chrisvivasai"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full">
                <Twitter className="mr-2 h-5 w-5" />
                Twitter
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
