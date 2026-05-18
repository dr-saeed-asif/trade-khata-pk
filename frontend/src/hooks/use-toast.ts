import { useToastStore } from '@/store/toast-store'

export const useToast = () => {
  const push = useToastStore((state) => state.push)
  return {
    toast: push,
  }
}
