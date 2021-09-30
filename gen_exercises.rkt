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
(define the-namespace (namespace-anchor->namespace anc))

(define alphabet (string->list "abcdefghijklmnopqrstuvwxyz"))

; Number -> String
; when using this to generate variable names, call with (random-string 1 #f #f)
; length should be 1 to not conflict with keywords like cond, if, let , incase the rng does gen these
; add-quotes? is because this needs to be spit out as a json string for html
(define (random-string len [add-quotes? #t] [ran-caps #f])
  (define res
    (list->string
     (map (lambda (_)
            (define v (random-ref alphabet))
            (if (and ran-caps (ran-bool))
                (char-upcase v)
                v)) (range len))))
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

;; (rangify '(8 1 6 7 8 9 4 2))
;; produces '(8 1 (6 . 9) 4 2)
;; (7 4 3 2) -> (7 4 3 2)
;credits to samph#0815 from racket discord
(define (rangify a-list)
  (match a-list
    [(list)   null]
    [(list _) a-list]
    [(or (list (cons a b) c rest ...)
         (list (and a b) c rest ...))
     (if (= 1 (- c b))
         (rangify (cons (cons a c) rest))
         (cons (car a-list)
               (rangify (cdr a-list))))]))

; typeof, string=? , arithmetic comparisons
; Number -> List<symbols>
; 0-2 valid range, pass in (random 0 3) for random
(define (bool-exp ran-choice)
  ; (define ran-choice (random 4))
  (define typeof 0)
  (define string-comp 1)
  (define arith 2)
  (define comps '(< > <= >= =))
  (define exp
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
  exp)

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

; List<String|Number, String|Number>
; returns a list of length 2 of random date
; uppercase??
(define (ran-data-unique amount [range 10] [string-len 1] [ran-caps #f])
  ; returns a string, number
  ; excluding bool because it prints them weirdly, e.g #t/#f while seralizing them to an answer is true or false
  (define (ran-data)
    (random-ref (list (random 1 range) (random-string string-len #t ran-caps))))

  (define (aux count acc)
    (cond [(= count 0) acc]
          [else
           (define r (ran-data))
           (if (member r acc)
               (aux count acc)
               (aux (- count 1) (cons r acc)))]))
  (aux amount empty))

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

; produces a list of random garbled strings and makes sure they're unique:
; (list "ab" "cd")
; WARNING! do not generate 2 letter random words for random variable names because it could generate keywords like "if"
(define (ran-strings-unique numchars amount)
  (define (aux item acc)
    (cond [(= (length acc) amount) acc]
          [(member item acc) (aux (random-string numchars #f) acc)]
          [else
           (aux (random-string numchars #f) (cons item acc))]))
  (aux (random-string numchars #f) empty))

; Number -> JSON
(define (gen-exercise mn)
  (cond
    [(= 0 mn) (define ranmath (gen-ran-arith-problem 5))
              (define prob (problem "input" (wrap-prism-js (~a ranmath)) (eval ranmath the-namespace) "input a number eg 42" ))
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
                (define ans (eval (cons 'begin ranmath) the-namespace))
                (define prob (problem "input" (wrap-prism-js
                                               (string-append "; What number does line 6 evaluate to? \n"
                                                              (foldr string-append "" quest))) ans "input a number eg: 42" ))
                (problem->jsexpr prob)]
    [(= 2.4 mn) (define anagrams (call-with-input-file "./anagrams.txt"
                                   (lambda (p)
                                     (read p))))
                (define ran-index (random (length anagrams)))
                (define q&a (list-ref anagrams ran-index))
                ; (define q&a (list "lunacies" (list "scan")))
                ; (println q&a)
                (define orig-wd (car q&a))
                (define ana-list (cadr q&a))
                (define rand-ana (list-ref ana-list (random (length ana-list))))
                (define ran-var-name (string->symbol (random-string 1 #f #f)))
                (define quest (string-append
                               (wrap-prism-js (string-append "; Build the string: \"" rand-ana "\", from: \n"
                                                             "(define " (symbol->string ran-var-name) " \"" orig-wd "\")"))))
                (define ana-sexp (map (lambda (ch) (index-of (string->list orig-wd) ch)) (string->list rand-ana)))
                (define ranges (map (lambda (v)
                                      (cond [(number? v) (list 'substring ran-var-name v (add1 v))]
                                            [else (list 'substring ran-var-name (car v) (add1 (cdr v)))])) (rangify ana-sexp)))
                ; BUG(fixed but be warned): lunacies -> scan for some reason gives : (string-append (substring rl 7 8) (substring rl 2 5))
                ; farmings -> farm only requires 1 substring, so if there is only 1 substring, you dont need string append
                (define prob (problem "input" quest (~a (if (= 1 (length ranges)) ranges (cons 'string-append ranges))) "Using as <b>FEW</b> string-append's and substring's as possible, e.g: <code>(string-append (substring vr 0 1) ...)</code>" ))
                (problem->jsexpr prob)]
    [(= 2.5 mn)
     ;answer is a random data type, keep it simple cause in 2.6 we will make the answers harder

     (define branches (ran-data-unique 2 10 4 #t))
     (define quest (list 'if (bool-exp (random 0 3)) (car branches) (cadr branches)))
     (define prob (problem "input" (wrap-prism-js (~a quest)) (eval quest the-namespace) "evaluate and input a quoted <code>\"string\", number or boolean(true, false)</code>"))
     (problem->jsexpr prob)
     ]
    [(= 2.6 mn)
     ; answer is a math exp that needs to be evaluated
     (define quest (list 'if (ran-logical 2) (gen-ran-arith-problem 2) (gen-ran-arith-problem 2)))
     (define prob (problem "input" (wrap-prism-js (~a quest)) (eval quest the-namespace) "input a number eg 42" ))
     (problem->jsexpr prob)
     ]
    [(= 2.7 mn)
     ; practice scope and evaluating a function, e.g having a global constant variable vs local
     ; and recognizing when variables are not even used within the function
     #|
    (define gg 1)
    (define (f gg hh zz bb)
      (+ gg hh)) ; should randomly choose whether to use the variable or not
    (f gg 2 3 4) ; randomly use a variable in global scope
    |#

     (define random-names (map string->symbol (ran-strings-unique 1 (random 5 7))))
     (define fname (car random-names))
     (define var-names (cdr random-names))
     ; aka locals
     (define func-arg-names (take var-names (random 1 (length var-names)))) ; pick random amount of variable names, some of which may already be in global
     ; globals cant be random-ref because it will multi-invalid-define

     ; take backawards!
     (define globals (map (lambda (val)
                            (list 'define val (1-10))) (take (reverse var-names) (random 2 (length var-names)))))

     (define global-var-names (map cadr globals))
     (define locals-and-globals (append global-var-names func-arg-names))
     ;(println (list var-names global-var-names func-arg-names))
     ; local, global or constant??
     (define func-body `(,(random-ref '(+ -)) ,@(map (lambda (val) (if (ran-bool) val (1-10))) locals-and-globals)))
     ; need to randomize the local variable as well?
     (define func-header (list 'define `(,fname ,@func-arg-names)))
     (define func-call `(,fname
                         ,@(map (lambda (_)
                                  (random-ref
                                   (list
                                    (1-10)
                                    (cadr (random-ref globals))
                                    (list (random-ref (list '+ '-)) (1-10) (1-10)))))
                                (range (length func-arg-names)))))

     (define func-combined (append func-header (list func-body)))
     (define quest `(,@globals ,func-combined ,func-call))
     ;(println quest)
     (define ans (eval (cons 'begin quest) the-namespace))
     (define prob (problem "input"
                           (wrap-prism-js
                            (string-append "; What does the the function call on the last line evaluate to? \n"
                                           (foldr string-append ""
                                                  (map (lambda (v)
                                                         (string-append (~a v) "\n")) quest)))) ans "input a number eg: 42" ))
     (problem->jsexpr prob)]
    [(= 2.8 mn)
     ; functions calling a function, and scope resolving
     #|
    (define gg 1)
    (define (x ab cd ef) (+ 1 ab)) ; random
    (define (f gg hh zz bb)
      (+ gg hh (x gg hh zz ))) ; should randomly choose whether to use the variable or not
    (f gg 2 3 4) ; randomly use a variable in global scope
    |#
     ; TODO: REFACTOR ALL OF THIS TO BE ABLE TO GENERATE N AMOUNT OF FUNCTIONS
     ; first two will be func names, rest are local/global names
     (define random-names (map string->symbol (ran-strings-unique 1 (random 5 7))))
     (define fname (car random-names))
     (define fname2 (cadr random-names))
     (define var-names (cdr (cdr random-names)))

     (define globals (map (lambda (val)
                            (list 'define val (1-10))) (take (reverse var-names) (random 2 (length var-names)))))

     (define global-var-names (map cadr globals))

     (define func-arg-names2 (take var-names (random 1 (length var-names)))) ; pick random amount of variable names, some of which may already be in global

     (define locals-and-globals2 (append global-var-names func-arg-names2))

     (define func-header2 (list 'define (cons fname2 func-arg-names2)))

     (define func-body2 `(,(random-ref '(+ -))
                          ,@(map
                             (lambda (val)
                               (define choice (random 0 2))
                               (cond [(= choice 0) (1-10)]
                                     [(= choice 1) val]
                                     )) locals-and-globals2)))

     (define func-arg-names (take var-names (random 1 (length var-names)))) ; pick random amount of variable names, some of which may already be in global
     (define locals-and-globals (append global-var-names func-arg-names))

     (define func-body `(,(random-ref '(+ -))
                         ,@(map
                            (lambda (val)
                              (define choice (random 0 3))
                              (cond [(= choice 0) (1-10)]
                                    [(= choice 1) val]
                                    [else (flatten (list fname2 (build-list (length func-arg-names2) (lambda (_) (1-10)))))] ; func call
                                    )) locals-and-globals)))

     (define func-header (list 'define (cons fname func-arg-names)))

     (define func-call `(,fname
                         ,@(map (lambda (_)
                                  (random-ref
                                   (list
                                    (1-10)
                                    (cadr (random-ref globals))
                                    (list (random-ref (list '+ '-)) (1-10) (1-10)))))
                                (range (length func-arg-names)))))

     (define func-combined (append func-header (list func-body)))
     (define func-combined2 (append func-header2 (list func-body2)))
     (define quest `(,@globals ,func-combined2 ,func-combined ,func-call))
     (define ans (eval (cons 'begin quest) the-namespace))
     (define prob (problem "input"
                           (wrap-prism-js
                            (string-append "; What does the function call on the last line evaluate to? \n"
                                           (foldr string-append ""
                                                  (map (lambda (v)
                                                         (string-append (~a v) "\n")) quest)))) ans "input a number eg: 42" ))
     (problem->jsexpr prob)
     ]
    [(= 2.9 mn)
     (define random-names (map string->symbol (ran-strings-unique 1 10)))
     (define-values (s1 s2) (split-at random-names 5))
     (define s1-name (car s1))
     (define s2-name (car s2))
     (define s1-field-names (cdr s1))
     (define s2-field-names (cdr s2))
     (define all-values (ran-data-unique 8 10 1 #t))
     (define-values (s1-vals s2-vals) (split-at all-values 4))
     (define s1-constructor (string->symbol (string-append "make-" (symbol->string s1-name))))
     (define s2-constructor (string->symbol (string-append "make-" (symbol->string s2-name))))
     (define s1-instance `(,s1-constructor ,@s1-vals))
     (define s2-instance `(,s2-constructor ,@s2-vals))

     ; random upppercase to force them to use operators on the result of accessing it?
     ; mix numbers into it to force number->string?
     (define quest
       `((define-struct ,s1-name ,s1-field-names)
         (define-struct ,s2-name ,s2-field-names)
         (define i1 ,s1-instance)
         (define i2 ,s2-instance)))
     (define ran-s1-indexes (build-list 2 (lambda (_) (random 0 (sub1 (length s1-vals))))))
     (define ran-s2-indexes (build-list 2 (lambda (_) (random 0 (sub1 (length s2-vals))))))

     ; String | Number -> String
     ; if the string is quoted, remove the quotes
     (define (normalize-to-string item)
       (cond [(string? item) (substring item 1 (sub1 (string-length item)))]
             [else (number->string item)]))

     (define build-this
       (apply string-append
              (map (lambda (i1 i2)
                     (define v1 (list-ref s1-vals i1))
                     (define v2 (list-ref s2-vals i2))
                     (string-append
                      (normalize-to-string v1)
                      (normalize-to-string v2))) ran-s1-indexes ran-s2-indexes)))
     (define _ans-exps
       (map (lambda (i1 i2)
              (define v1 (list-ref s1-vals i1))
              (define v2 (list-ref s2-vals i2))

              (define (wrap-convert item inner)
                (cond [(string? item) inner]
                      [else (list 'number->string inner)]))

              (define f1 (list-ref s1-field-names i1))
              (define f2 (list-ref s2-field-names i2))
              (define s1-accessor (string->symbol (string-append (symbol->string s1-name) "-" (symbol->string f1))))
              (define s2-accessor (string->symbol (string-append (symbol->string s2-name) "-" (symbol->string f2))))
              (define extract1 (list s1-accessor 'i1))
              (define extract2 (list s2-accessor 'i2))
              (list (wrap-convert v1 extract1) (wrap-convert v2 extract2))) ran-s1-indexes ran-s2-indexes))
     ; use max 2-4 fields
     (define ans `(string-append ,@(car _ans-exps) ,@(cadr _ans-exps)))
     ; (println (list quest ans build-this))
     (define prob (problem "input"
                           (wrap-prism-js
                            (string-append (string-append "; BUILD THE STRING: \"" build-this "\"\n")
                                           (foldr string-append ""
                                                  (map (lambda (v)
                                                         (string-append (~a v) "\n")) quest))))
                           (~a ans) "example answer: <code>(string-append ...)</code>"))
     ;(println (list q-exp ran-s1-indexes ran-s2-indexes build-this ans-exp))
     (problem->jsexpr prob)]
    ; TODO: collage, recursively call this function X amount of times for test on these basics,
    ; 20 question challenge
    [else
     ; (println "invalid exercise id, defaulting to 0")
     (gen-exercise 0)]))

; Number Number -> problems
(define (res id amount) (map (lambda (i)
                               (gen-exercise id)) (range amount)))

(printf "~a\n" (jsexpr->bytes (res (exercise-id) (amount))))
;(println (gen-exercise (exercise-id)))