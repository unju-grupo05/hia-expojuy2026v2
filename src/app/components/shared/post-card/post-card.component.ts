import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PostCardData {
  title: string;
  category: string;
  date: string;
  imageUrl: string;
  body?: string;
  slug?: string;
}

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './post-card.component.html'
})
export class PostCardComponent {
  public post = input.required<PostCardData>();
  public size = input<'large' | 'small'>('small');
}
