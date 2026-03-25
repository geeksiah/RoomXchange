import "react-native";
import "@react-native/virtualized-lists";

declare module "react-native" {
  interface ViewProps {
    className?: string;
    cssInterop?: boolean;
  }

  interface TextProps {
    className?: string;
    cssInterop?: boolean;
  }

  interface TextInputProps {
    className?: string;
    placeholderClassName?: string;
    cssInterop?: boolean;
  }

  interface ImagePropsBase {
    className?: string;
    cssInterop?: boolean;
  }

  interface ScrollViewProps {
    contentContainerClassName?: string;
    indicatorClassName?: string;
  }

  interface FlatListProps<ItemT> {
    columnWrapperClassName?: string;
  }

  interface KeyboardAvoidingViewProps {
    contentContainerClassName?: string;
  }

  interface TouchableWithoutFeedbackProps {
    className?: string;
    cssInterop?: boolean;
  }

  interface SwitchProps {
    className?: string;
    cssInterop?: boolean;
  }

  interface StatusBarProps {
    className?: string;
    cssInterop?: boolean;
  }

  interface InputAccessoryViewProps {
    className?: string;
    cssInterop?: boolean;
  }

  interface ModalBaseProps {
    presentationClassName?: string;
  }
}

declare module "@react-native/virtualized-lists" {
  import type { ScrollViewProps } from "react-native";

  interface VirtualizedListWithoutRenderItemProps<ItemT> extends ScrollViewProps {
    ListFooterComponentClassName?: string;
    ListHeaderComponentClassName?: string;
  }
}

export {};
