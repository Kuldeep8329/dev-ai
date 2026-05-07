try:
    from langchain_core.prompts import PromptTemplate
    print("langchain_core.prompts works")
except ImportError:
    print("langchain_core.prompts fails")

try:
    from langchain_core.runnables import RunnablePassthrough
    print("langchain_core.runnables works")
except ImportError:
    print("langchain_core.runnables fails")

try:
    from langchain_core.output_parsers import StrOutputParser
    print("langchain_core.output_parsers works")
except ImportError:
    print("langchain_core.output_parsers fails")
