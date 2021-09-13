#lang racket

(define words
  (list->vector
   (call-with-input-file "corncob_lowercase.txt" (lambda (p)
                                                   (port->lines p)))))

(define alphabet (map string (string->list "abcdefghijklmnopqrstuvwxyz")))
;(define words (vector "bane"))

; String List<Char> -> Number
; returns the number of matching letters ONCE!
(define (string-encapsed? str letters #:once? once?)
  (define chars (string->list str))
  (define res (foldl
               (lambda (lt acc)
                 (define excludes (car acc))
                 (define mchar (findf (lambda (v)
                                        (char=? v lt)) chars))
                 (define ex (if once?
                                (not (member mchar excludes))
                                #t))
                 (if (and ex mchar)
                     (list (cons mchar excludes) (add1 (cadr acc)))
                     acc)) (list null 0) letters))
  (cadr res))

; greater than or eq 8 letter words

(define (has-duplicate-letters? str)
  (define word-letters (string->list str))
  (define (aux ltr acc)
    ; (println (list (car ltr) word-letters count))
    (cond
      [(empty? ltr) #f]
      [(> (string-encapsed? (car ltr) word-letters #:once? #f) 1) #t]
      [else (aux (cdr ltr) #f)]))
  (aux alphabet #f))

(define ge-8-words (vector-filter (lambda (v)
                                    (and (>= (string-length v) 8)
                                         (not (has-duplicate-letters? v)))) words))

(define (pick-random v amount)
  (define res (make-vector amount 0))
  (define (pick  _) (vector-ref v (random (vector-length v))))
  (vector-map! pick res))

(define pick (pick-random ge-8-words 100))
; (define pick ge-8-words)

; (println (vector-length ge-8-words))



(define anagramed (vector-map
                   (lambda (8l-word)
                     (define letters (string->list 8l-word))
                     (define anagrams (vector-filter
                                       (lambda (wd)
                                         (and (not (string=? wd 8l-word))
                                              (>= (string-length wd) 4)
                                              (= (string-length wd) (string-encapsed? wd letters #:once? #t)))) words))
                     (define num-of-ana (vector-length anagrams))
                     (define pick-random
                       (cond [(> num-of-ana 0) (vector->list anagrams) #| to export one, uncomment this block (vector-ref anagrams (random num-of-ana))|#]
                             [#f])) ; if there are no anagrams, we gotta filter it out
                     (list 8l-word pick-random)) pick))

; '#(("rampaged" "gamed"))
; SINCE you can (substring) either of the 2 as in rampaged, its hard to make a web version of this. Strings must not have duplicate letters

(call-with-output-file
    "anagrams.txt"
  (lambda (out)
    (define valid-anagrams (vector-filter (lambda (v) (not (boolean? (second v)))) anagramed))
    (write (vector->list valid-anagrams) out)) #:exists 'replace #:mode 'text)
; cats
; scat
; sat
; at
