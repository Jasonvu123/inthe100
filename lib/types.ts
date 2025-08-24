export type Category = {
  id: string;
  name: string;
  source: string;     
  items: Record<number, string>; 
};

export type Clue = {
  category_id: string;
  category_name: string;
  source: string;
  item: string;
  hint_item: string;
};

export type Puzzle = {
  date: string;  // YYYY-MM-DD (ET)
  n: number;     // shared rank
  clues: Clue[]; // 5 cards
};
