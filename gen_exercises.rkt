#lang racket/base
(require racket/random)
(require racket/cmdline)
(require racket/format)
(require racket/list)
(require racket/match)
(require json)

(provide (all-defined-out))

; used to pass into eval so + - and other functions are defined
(define-namespace-anchor anc)
(define ns (namespace-anchor->namespace anc))

(define alphabet (string->list "abcdefghijklmnopqrstuvwxyz"))

; Number -> String
(define (random-string len [add-quotes? #t])
  (define res
    (list->string
     (map (lambda (_) (random-ref alphabet)) (range len))))
  (cond [add-quotes? (string-append "\"" res "\"")]
        [else res]))
; Answer is:
; - string
; - number
; - Choice
(struct choice (text correct) #:transparent)

; string string Answer string string number number number
(struct problem (type question answer input_answer_hint [tries #:auto] [time #:auto] [hints #:auto])
  #:auto-value 0
  #:transparent)

; Problem -> Hash
(define (problem->jsexpr p)
  (hasheq 'type (problem-type p)
          'question (problem-question p)
          'answer (problem-answer p)
          'input_answer_hint (problem-input_answer_hint p)
          'result "❓"
          'tries (problem-tries p)
          'time (problem-tries p)
          'hints (problem-hints p)))

(define (ran-bool)
  (= 0 (random 2)))

; generates a number from 1-10 inclusive
(define (1-10)
  (random 1 11))

; no division because decimals are a pain
(define arith '(+ - *))
; (random-ref arith)

; returns a List<Symbol T E> | Number
(define (ran-exp-or-num e1 e2)
  (define expression? (ran-bool))
  (cond [expression? (list (random-ref arith) e1 e2)]
        [else (1-10)]))

; Number -> List<Symbols>
; random mathematical expression (+ 1 2 (* 4 6))
; amount effects the level of random nesting
; do not pass less than 2 because it can generate invalid BSL expressions (* (1 2)) , BSL requires 2 args for arithmetic ops
; unless you're ok with explaaining to students that arithmetic operations in racket can take 1 argument
(define (gen-ran-arith-problem amount)
  (define (aux acc amount)
    (define ran-nest (ran-bool))
    (cond
      [(= amount 0) acc]
      [ran-nest (aux (cons (cons (random-ref arith) (list (ran-exp-or-num (1-10) (1-10)) (ran-exp-or-num (1-10) (1-10)))) acc) (sub1 amount))]
      [else (aux (cons (ran-exp-or-num (1-10) (1-10)) acc) (sub1 amount))]))
  (reverse (aux (list (random-ref arith)) amount)))

; should also return the namespace for where the defines exist?

; Number -> List<Symbols>
; arithmetic operations but referencing variables
#|
'(define bar (* 9 7))
'(define purr (- (+ bar 3) (* 4 bar)))
'(define woof (- (- purr bar) (+ bar 4)))
'(define maties (+ (* 3 10) (- 4 bar)))
'(- (- maties woof) (* purr bar))
|#
(define (gen-ran-variable-arith-problem)
  (define var-name-sets (list '(foo bar baz boo) '(meow purr hiss rawr) '(woof bark arf bark) '(yarr arr maties ahoy)))
  (define ran-var-set (map (lambda (v) (random-ref v)) var-name-sets))
  ; no multiplcation because numbers can get extremely big
  (define (+/- e1 e2)
    (list (random-ref '(+ -)) e1 e2))
  (define prob (map (lambda (v index)
                      (define available-vars (take ran-var-set index))
                      (define rv
                        (cond [(= 0 index) (+/- (1-10) (1-10))]
                              [else
                               (define (ee) (list (random-ref available-vars)
                                                  (random-ref available-vars)
                                                  (1-10)))
                               (+/-
                                (+/-
                                 (random-ref (ee))
                                 (random-ref (ee)))
                                (+/-
                                 (random-ref (ee))
                                 (random-ref (ee))))]))
                      (define var-definition (list 'define (list-ref ran-var-set index) rv))
                      var-definition) ran-var-set (range (length ran-var-set))))
  (define shuffed (shuffle ran-var-set))
  (define-values (a b) (split-at shuffed 2))
  (define combined-vars-op (+/- (+/- (first a) (second a))
                                (+/- (first b) (second b))))
  (append prob (list combined-vars-op)))

(define exercise-id (make-parameter 0))
(define amount (make-parameter 1))
(define disable-prism (make-parameter 0))

; credits to: Plane#0324 from racket discord
; converts nested prefix arithmetic expressions to infix
(define (infix expr)
  (match expr
    [(list operator operands ...)
     (rest (append*
            (for/list ([operand operands])
              (list operator
                    (infix operand)))))]
    [x x]))


(define (add-range output low high)
  (cons (if (equal? low high) low (list low high)) output))

;; (rangify '(8 1 6 7 8 9 4 2))
;; produces '(8 1 (6 9) 4 2)
;credits to notjack#9941 from racket discord
(define (rangify integers)
  (cond
    [(empty? integers) '()]
    [else
     (for/fold ([output '()]
                [low (first integers)]
                [high (first integers)]
                #:result (reverse (add-range output low high)))
               ([x (in-list integers)])
       (if (<= (sub1 low) x (add1 high))
           (values output (min low x) (max high x))
           (values (add-range output low high) x x)))]))

; typeof, string=? , arithmetic comparisons
; Number -> List<symbols>
; 0-2 valid range, pass in (random 0 3) for random
(define (bool-exp ran-choice)
  ; (define ran-choice (random 4))
  (define typeof 0)
  (define string-comp 1)
  (define arith 2)
  (define comps '(< > <= >= =))
  (define bool-exp
    (cond
      [(= ran-choice typeof) (list (random-ref '(string? number?)) (random-ref (list (random 100) (random-string 4))))]
      [(= ran-choice string-comp)
       (define r1 (random-string 4))
       (define r2 (random-string 4))
       (list 'string=? (random-ref (list r1 r2)) (random-ref (list r1 r2)))]
      [(= ran-choice arith)
       (list (random-ref comps)
             (random-ref (list (list 'string-length (random-string (random 1 10))) (gen-ran-arith-problem 2)))
             (random-ref (list (list 'string-length (random-string (random 1 10))) (gen-ran-arith-problem 2))))]
      ))
  bool-exp)

; Number -> List<Symbols>
; generates a list of randomly nested logical ops, and or not
; num effects amount
(define (ran-logical num)
  (define (ran-op) (random-ref (list 'and 'or 'not)))
  (define (ran-exp e1 e2)
    (define rchoice (ran-op))
    (cond
      [(eq? rchoice 'not) (list rchoice e1)]
      [else
       ;needs two expressions
       (list rchoice e1 e2)
       ]))
  (define res
    (foldl (lambda (_ acc)
             (cons (ran-exp (ran-exp (ran-bool) (ran-bool)) (ran-exp (ran-bool) (ran-bool))) acc)) empty (range num)))
  (cons (random-ref (list 'and 'or)) res))

; returns a string, number or bool
(define (ran-data)
  (random-ref (list (random 1 10) (random-string 4) (ran-bool))))

; returns a random list of data guarnteeing booleans not to be equal
(define (ran-data-unique)
  (define a (ran-data))
  (define b (ran-data))
  (define are-bools? (and (boolean? a) (boolean? b)))
  (if (and are-bools? (and a b))
      (ran-data-unique)
      (list a b)))
;; command line parser
(define parser
  (command-line
   #:usage-help
   "-e for exercise number"

   #:once-each
   [("-e" "--exercise") NUM
                        "Set the exercise id"
                        (exercise-id (string->number NUM))]

   [("-a" "--amount") NUM
                      "Set the amount to generate"
                      (amount (string->number NUM))]
   [("-p" "--prismjs") NUM
                       "Should the question be wrapped around html for prismjs?, 1 to turn it off"
                       (disable-prism (string->number NUM))]
   #:args () (void)))

(define (wrap-prism-js str)
  (define (wrap-html str)
    (string-append "<pre class=\"line-numbers match-braces rainbow-braces\"><code class=\"language-racket\">"
                   str
                   "</code></pre>"))
  (cond [(= (disable-prism) 0) (wrap-html str)]
        [else str]))

; Number -> JSON
(define (gen-exercise mn)
  (cond
    [(= 0 mn) (define ranmath (gen-ran-arith-problem 5))
              (define prob (problem "input" (wrap-prism-js (~a ranmath)) (eval ranmath ns) "input a number eg 42" ))
              (problem->jsexpr prob)]
    [(= 2.1 mn) (define ranmath (gen-ran-arith-problem 2))
                (define infixed (infix ranmath))
                (define instructions "<h1>Translate the math expression to racket code equiv</h1>")
                (define quest (string-append instructions (wrap-prism-js (~a infixed))))
                (define ans (~a ranmath)) ; frontend/whatever checks the problem should strip whitespace
                (define prob (problem "input" quest ans "input math expression eg: (+ 1 1 (- 3 2))" ))
                (problem->jsexpr prob)]
    [(= 2.3 mn) (define ranmath (gen-ran-variable-arith-problem))
                ;TODO make a version wokring backwards? filling in the blank for the missing values of the variables?
                ; to teach debugging and backtracking? NEVERMIND, would require too much algebra?
                (define quest (map (lambda (v)
                                     (string-append (~a v) "\n")) ranmath))
                ; (println quest)
                (define ans (eval (cons 'begin ranmath) ns))
                (define prob (problem "input" (wrap-prism-js
                                               (string-append "; What number does line 6 evaluate to? \n"
                                                              (foldr string-append "" quest))) ans "input a number eg: 42" ))
                (problem->jsexpr prob)]
    [(= 2.4 mn) (define anagrams (call-with-input-file "./anagrams.txt"
                                   (lambda (p)
                                     (read p))))
                (define ran-index (random (length anagrams)))
                (define q&a (list-ref anagrams ran-index))
                (define orig-wd (car q&a))
                (define ana-list (cadr q&a))
                (define rand-ana (list-ref ana-list (random (length ana-list))))
                (define ran-var-name (string->symbol (string (random-ref alphabet) (random-ref alphabet))))
                (define quest (string-append
                               (wrap-prism-js (string-append "; Build the string: \"" rand-ana "\", from: \n"
                                                             "(define " (symbol->string ran-var-name) " \"" orig-wd "\")"))))
                (define ana-sexp (map (lambda (ch) (index-of (string->list orig-wd) ch)) (string->list rand-ana)))
                (define ranges (map (lambda (v)
                                      (cond [(number? v) (list 'substring ran-var-name v (add1 v))]
                                            [else (list 'substring ran-var-name (car v) (add1 (cadr v)))])) (rangify ana-sexp)))
                ; farmings -> farm only requires 1 substring, so if there is only 1 substring, you dont need string append
                (define prob (problem "input" quest (~a (if (= 1 (length ranges)) ranges (cons 'string-append ranges))) "Using as <b>FEW</b> string-append's and substring's as possible, e.g: <code>(string-append (substring vr 0 1) ...)</code>" ))
                (problem->jsexpr prob)]
    [(= 2.5 mn)
     ;answer is a random data type, keep it simple cause in 2.6 we will make the answers harder

     (define branches (ran-data-unique))
     (define quest (list 'if (bool-exp (random 0 3)) (car branches) (cadr branches)))
     (define prob (problem "input" (wrap-prism-js (~a quest)) (eval quest ns) "evaluate and input a quoted \"string\", number or boolean(true, false)" ))
     (problem->jsexpr prob)
     ]
    [(= 2.6 mn)
     ; answer is a math exp that needs to be evaluated
     (define quest (list 'if (ran-logical 2) (gen-ran-arith-problem 2) (gen-ran-arith-problem 2)))
     (define prob (problem "input" (wrap-prism-js (~a quest)) (eval quest ns) "input a number eg 42" ))
     (problem->jsexpr prob)
     ]
    [else
     ; (println "invalid exercise id, defaulting to 0")
     (gen-exercise 0)]))

; Number Number -> problems
(define (res id amount) (map (lambda (i)
                               (gen-exercise id)) (range amount)))

(printf "~a\n" (jsexpr->bytes (res (exercise-id) (amount))))
;(println (gen-exercise (exercise-id)))