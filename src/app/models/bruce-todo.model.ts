export interface BruceTodo {
  _id: string;
  text: string;
  done: boolean;
  priority: 'low' | 'normal' | 'high';
  category?: string;
  createdAt: string;
  updatedAt: string;
}
