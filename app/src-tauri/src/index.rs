//! `INDEX.md`: a lossless, line-based parser and serializer.
//!
//! Every line of the file is kept. Item lines that were not changed are
//! written back byte-for-byte; lines Grimoire doesn't understand are kept
//! verbatim. That is what makes hand edits safe.

use crate::content::{classify, ContentKind};
use serde::Serialize;
use std::collections::HashSet;

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub id: String,
    pub title: String,
    pub source: String,
    pub tags: Vec<String>,
    pub done: bool,
    pub kind: ContentKind,
    /// Host for URLs, "local PDF" for files inside the item folder.
    pub origin: String,
    /// Whether the line carries a `[notes](<id>/NOTES.md)` link yet.
    pub linked: bool,
}

#[derive(Debug, Clone)]
pub enum Line {
    Item { item: Item, raw: Option<String>, extra: Vec<String> },
    Raw(String),
}

#[derive(Debug, Clone, Default)]
pub struct Index {
    pub lines: Vec<Line>,
    pub conflicted: bool,
}

pub fn origin_of(source: &str) -> String {
    if source.starts_with("http://") || source.starts_with("https://") {
        url::Url::parse(source)
            .ok()
            .and_then(|u| u.host_str().map(|h| h.trim_start_matches("www.").to_string()))
            .unwrap_or_else(|| source.to_string())
    } else {
        "local PDF".to_string()
    }
}

fn is_tag(tok: &str) -> bool {
    let Some(rest) = tok.strip_prefix('#') else { return false };
    let mut chars = rest.chars();
    match chars.next() {
        Some(c) if c.is_ascii_alphanumeric() => {}
        _ => return false,
    }
    chars.all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '/'))
}

/// Reads `[text](target)` at the start of `s`. Brackets and parentheses may
/// nest. Returns (text, target, rest).
fn take_link(s: &str) -> Option<(String, String, &str)> {
    let s = s.strip_prefix('[')?;
    let mut depth = 0i32;
    let mut end = None;
    let bytes: Vec<char> = s.chars().collect();
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            '\\' => i += 1,
            '[' => depth += 1,
            ']' if depth == 0 => {
                if bytes.get(i + 1) == Some(&'(') {
                    end = Some(i);
                    break;
                }
                return None;
            }
            ']' => depth -= 1,
            _ => {}
        }
        i += 1;
    }
    let end = end?;
    let text: String = bytes[..end].iter().collect();
    let mut j = end + 2;
    let mut pdepth = 0i32;
    let start = j;
    while j < bytes.len() {
        match bytes[j] {
            '(' => pdepth += 1,
            ')' if pdepth == 0 => break,
            ')' => pdepth -= 1,
            _ => {}
        }
        j += 1;
    }
    if j >= bytes.len() {
        return None;
    }
    let target: String = bytes[start..j].iter().collect();
    let consumed: usize = bytes[..=j].iter().map(|c| c.len_utf8()).sum();
    Some((text.replace("\\]", "]").replace("\\[", "["), target, &s[consumed..]))
}

fn parse_item(line: &str) -> Option<(Item, Vec<String>)> {
    let t = line.trim_end();
    let rest = t.strip_prefix("- [").or_else(|| t.strip_prefix("* ["))?;
    let mut chars = rest.chars();
    let state = chars.next()?;
    let done = match state {
        ' ' => false,
        'x' | 'X' => true,
        _ => return None,
    };
    let after = chars.as_str().strip_prefix(']')?;
    if !after.starts_with(' ') {
        return None;
    }
    let rest = after.trim_start();
    let (title, source, mut rest) = take_link(rest)?;
    if title.trim().is_empty() || source.trim().is_empty() {
        return None;
    }
    let mut tags = Vec::new();
    let mut extra = Vec::new();
    let mut id = None;
    loop {
        rest = rest.trim_start();
        if rest.is_empty() {
            break;
        }
        if rest.starts_with('[') {
            if let Some((text, target, r)) = take_link(rest) {
                if text == "notes" {
                    if let Some(slug) = target.strip_suffix("/NOTES.md") {
                        id = Some(slug.to_string());
                        rest = r;
                        continue;
                    }
                }
                extra.push(format!("[{text}]({target})"));
                rest = r;
                continue;
            }
        }
        let end = rest.find(char::is_whitespace).unwrap_or(rest.len());
        let tok = &rest[..end];
        if is_tag(tok) {
            let tag = tok[1..].to_lowercase();
            if !tags.contains(&tag) {
                tags.push(tag);
            }
        } else if tok != "·" {
            extra.push(tok.to_string());
        }
        rest = &rest[end..];
    }
    let source = source.trim().to_string();
    let linked = id.is_some();
    Some((
        Item {
            id: id.unwrap_or_default(),
            title: title.trim().to_string(),
            kind: classify(&source),
            origin: origin_of(&source),
            source,
            tags,
            done,
            linked,
        },
        extra,
    ))
}

pub fn serialize_item(item: &Item, extra: &[String]) -> String {
    let title = item.title.replace('[', "\\[").replace(']', "\\]");
    let mut s = format!("- [{}] [{}]({})", if item.done { "x" } else { " " }, title, item.source);
    for t in &item.tags {
        s.push_str(" #");
        s.push_str(t);
    }
    for e in extra {
        s.push(' ');
        s.push_str(e);
    }
    if item.linked {
        s.push_str(&format!(" · [notes]({}/NOTES.md)", item.id));
    }
    s
}

pub fn is_conflict_marker(line: &str) -> bool {
    line.starts_with("<<<<<<<") || line.starts_with(">>>>>>>") || line == "=======" || line.starts_with("||||||| ")
}

impl Index {
    /// Parses the file. `taken` holds folder names already present in the vault,
    /// used to give unlinked items an id that won't collide.
    pub fn parse(text: &str, taken: &HashSet<String>) -> Index {
        let mut lines = Vec::new();
        let mut conflicted = false;
        let mut used: HashSet<String> = taken.clone();
        let mut pending_ids = Vec::new();
        for (n, raw) in text.split('\n').enumerate() {
            if is_conflict_marker(raw) {
                conflicted = true;
            }
            match parse_item(raw) {
                Some((item, extra)) => {
                    if item.linked {
                        used.insert(item.id.clone());
                    } else {
                        pending_ids.push(n);
                    }
                    lines.push(Line::Item { item, raw: Some(raw.to_string()), extra });
                }
                None => lines.push(Line::Raw(raw.to_string())),
            }
        }
        // A trailing newline produces one empty last element; drop it, serialize adds it back.
        if matches!(lines.last(), Some(Line::Raw(s)) if s.is_empty()) {
            lines.pop();
        }
        for n in pending_ids {
            if let Some(Line::Item { item, .. }) = lines.get_mut(n) {
                item.id = unique_slug(&item.title, &used);
                used.insert(item.id.clone());
            }
        }
        // Linked items whose ids repeat (copy-paste) keep the first; later ones get a fresh id.
        let mut seen = HashSet::new();
        for line in lines.iter_mut() {
            if let Line::Item { item, raw, .. } = line {
                if item.linked && !seen.insert(item.id.clone()) {
                    item.id = unique_slug(&item.title, &used);
                    used.insert(item.id.clone());
                    *raw = None;
                }
            }
        }
        Index { lines, conflicted }
    }

    pub fn serialize(&self) -> String {
        let mut out = String::new();
        for line in &self.lines {
            match line {
                Line::Raw(s) => out.push_str(s),
                Line::Item { item, raw: Some(r), .. } => {
                    let _ = item;
                    out.push_str(r)
                }
                Line::Item { item, raw: None, extra } => out.push_str(&serialize_item(item, extra)),
            }
            out.push('\n');
        }
        out
    }

    pub fn items(&self) -> Vec<Item> {
        self.lines
            .iter()
            .filter_map(|l| match l {
                Line::Item { item, .. } => Some(item.clone()),
                Line::Raw(_) => None,
            })
            .collect()
    }

    pub fn ids(&self) -> HashSet<String> {
        self.items().into_iter().map(|i| i.id).collect()
    }

    pub fn get_mut(&mut self, id: &str) -> Option<&mut Item> {
        for line in self.lines.iter_mut() {
            if let Line::Item { item, raw, .. } = line {
                if item.id == id {
                    *raw = None; // the caller is about to change it
                    return Some(item);
                }
            }
        }
        None
    }

    pub fn get(&self, id: &str) -> Option<&Item> {
        self.lines.iter().find_map(|l| match l {
            Line::Item { item, .. } if item.id == id => Some(item),
            _ => None,
        })
    }

    /// New items go after the last item, or under the first heading, or at the end.
    pub fn append(&mut self, item: Item) {
        let line = Line::Item { item, raw: None, extra: Vec::new() };
        let last_item = self.lines.iter().rposition(|l| matches!(l, Line::Item { .. }));
        let at = match last_item {
            Some(i) => i + 1,
            None => match self.lines.iter().position(|l| matches!(l, Line::Raw(s) if s.starts_with('#'))) {
                Some(h) => {
                    // Leave one blank line under the heading.
                    if !matches!(self.lines.get(h + 1), Some(Line::Raw(s)) if s.is_empty()) {
                        self.lines.insert(h + 1, Line::Raw(String::new()));
                    }
                    h + 2
                }
                None => self.lines.len(),
            },
        };
        self.lines.insert(at.min(self.lines.len()), line);
    }

    pub fn remove(&mut self, id: &str) -> bool {
        let before = self.lines.len();
        self.lines.retain(|l| !matches!(l, Line::Item { item, .. } if item.id == id));
        before != self.lines.len()
    }
}

const RESERVED: &[&str] = &[
    "sandbox", "con", "prn", "aux", "nul", "com1", "com2", "com3", "com4", "lpt1", "lpt2", "lpt3",
];

pub fn slug(title: &str) -> String {
    let ascii = deunicode::deunicode(title).to_lowercase();
    let mut s = String::new();
    let mut dash = false;
    for c in ascii.chars() {
        if c.is_ascii_alphanumeric() {
            s.push(c);
            dash = false;
        } else if !dash && !s.is_empty() {
            s.push('-');
            dash = true;
        }
    }
    let mut s: String = s.trim_matches('-').chars().take(60).collect();
    s = s.trim_end_matches('-').to_string();
    if s.is_empty() {
        s = "item".into();
    }
    if RESERVED.contains(&s.as_str()) {
        s.push_str("-item");
    }
    s
}

pub fn unique_slug(title: &str, taken: &HashSet<String>) -> String {
    let base = slug(title);
    if !taken.contains(&base) {
        return base;
    }
    (2..).map(|n| format!("{base}-{n}")).find(|c| !taken.contains(c)).unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE: &str = "# Grimoire\n\nSome prose I wrote.\n\n- [ ] [Attention Is All You Need](https://arxiv.org/abs/1706.03762) #ml #papers · [notes](attention-is-all-you-need/NOTES.md)\n- [x]  [Async Rust, chapter 3](https://rust-lang.github.io/async-book/03_async_await/01_chapter.html)   #rust #async · [notes](rust-async-book-ch-3/NOTES.md)\n- [ ] [Hand added (2nd ed.)](https://en.wikipedia.org/wiki/Foo_(bar)) #Wiki\n";

    #[test]
    fn round_trip_is_lossless() {
        let idx = Index::parse(SAMPLE, &HashSet::new());
        assert_eq!(idx.serialize(), SAMPLE);
    }

    #[test]
    fn parses_items() {
        let idx = Index::parse(SAMPLE, &HashSet::new());
        let items = idx.items();
        assert_eq!(items.len(), 3);
        assert!(items[1].done);
        assert_eq!(items[0].tags, vec!["ml", "papers"]);
        assert_eq!(items[0].origin, "arxiv.org");
    }

    #[test]
    fn unlinked_items_get_ids_and_parens_survive() {
        let idx = Index::parse(SAMPLE, &HashSet::new());
        let hand = idx.items().into_iter().find(|i| !i.linked).unwrap();
        assert_eq!(hand.id, "hand-added-2nd-ed");
        assert_eq!(hand.source, "https://en.wikipedia.org/wiki/Foo_(bar)");
        assert_eq!(hand.tags, vec!["wiki"]);
    }

    #[test]
    fn edits_only_touch_their_line() {
        let mut idx = Index::parse(SAMPLE, &HashSet::new());
        idx.get_mut("attention-is-all-you-need").unwrap().done = true;
        let out = idx.serialize();
        assert!(out.contains("- [x] [Attention Is All You Need](https://arxiv.org/abs/1706.03762) #ml #papers · [notes](attention-is-all-you-need/NOTES.md)"));
        assert!(out.contains("- [x]  [Async Rust, chapter 3]")); // untouched spacing kept
        assert!(out.contains("Some prose I wrote."));
    }

    #[test]
    fn append_goes_after_last_item() {
        let mut idx = Index::parse("# G\n", &HashSet::new());
        idx.append(Item {
            id: "a".into(),
            title: "A".into(),
            source: "https://a.dev".into(),
            tags: vec!["x".into()],
            done: false,
            kind: ContentKind::Article,
            origin: "a.dev".into(),
            linked: true,
        });
        assert_eq!(idx.serialize(), "# G\n\n- [ ] [A](https://a.dev) #x · [notes](a/NOTES.md)\n");
    }

    #[test]
    fn detects_conflicts() {
        let idx = Index::parse("<<<<<<< HEAD\n- [ ] [A](https://a)\n=======\n>>>>>>> x\n", &HashSet::new());
        assert!(idx.conflicted);
    }

    #[test]
    fn slugs() {
        assert_eq!(slug("Attention Is All You Need"), "attention-is-all-you-need");
        assert_eq!(slug("Café — déjà vu!"), "cafe-deja-vu");
        assert_eq!(slug("con"), "con-item");
        let taken: HashSet<String> = ["a".to_string()].into();
        assert_eq!(unique_slug("A", &taken), "a-2");
    }
}
