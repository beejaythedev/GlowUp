import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  secondary:
    "border border-border-strong bg-surface text-text hover:bg-bg",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "min-h-11 px-6 text-sm",
  lg: "min-h-14 px-8 text-base",
};

interface SharedProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

export type ButtonProps =
  | (SharedProps & { href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
  | (SharedProps & {
      href: string;
    } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">);

/** Renders as a Link when `href` is given, so a navigating CTA still looks like a button. */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (props.href !== undefined) {
    const { href, ...anchorProps } = props;
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
