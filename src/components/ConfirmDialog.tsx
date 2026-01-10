import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, AlertTriangle, Trash2, XCircle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "success" | "warning";
  onConfirm: () => void;
}

const variantIcons = {
  default: null,
  destructive: Trash2,
  success: CheckCircle2,
  warning: AlertTriangle,
};

const variantStyles = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  success: "gradient-cta text-white",
  warning: "bg-gold text-white hover:bg-gold/90",
};

const iconContainerStyles = {
  default: "bg-primary/10",
  destructive: "bg-destructive/10",
  success: "bg-mint/20",
  warning: "bg-gold/20",
};

const iconStyles = {
  default: "text-primary",
  destructive: "text-destructive",
  success: "text-mint",
  warning: "text-gold",
};

const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) => {
  const Icon = variantIcons[variant];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl border-0 shadow-elevated max-w-sm mx-auto">
        <AlertDialogHeader className="text-center">
          {Icon && (
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-full ${iconContainerStyles[variant]} flex items-center justify-center`}>
                <Icon className={`w-8 h-8 ${iconStyles[variant]}`} />
              </div>
            </div>
          )}
          <AlertDialogTitle className="text-xl font-bold text-foreground">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col mt-4">
          <AlertDialogAction
            onClick={onConfirm}
            className={`w-full py-3 rounded-full font-medium ${variantStyles[variant]}`}
          >
            {confirmText}
          </AlertDialogAction>
          <AlertDialogCancel className="w-full py-3 rounded-full bg-muted text-foreground hover:bg-muted/80 font-medium border-0">
            {cancelText}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
